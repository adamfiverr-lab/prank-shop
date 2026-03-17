import { GameEngine, type Potion, type DistributorState } from '../engine/GameEngine';
import { DISTRIBUTORS } from '../data/distributors';
import { playCoin, playPlop, playSuccessChime, playBubble } from '../audio/SoundEngine';

// ── Types ───────────────────────────────────────────────

interface FlyingPotion {
  x: number; y: number;
  targetX: number; targetY: number;
  color: string;
  landed: boolean;
  size: number;
}

interface FlyingCoin {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  size: number;
}

interface AmbientParticle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; alpha: number;
  color: string; life: number; maxLife: number;
}

type ViewMode = 'select' | 'npc';

// ── Scene themes per NPC ────────────────────────────────

interface NpcTheme {
  bgTop: string; bgBot: string;
  groundColor: string;
  ambientColor: string;
  particleColor: string;
  glowColor: string;
}

const NPC_THEMES: Record<string, NpcTheme> = {
  grix: { bgTop: '#0f1a08', bgBot: '#1a2810', groundColor: '#2a3a18', ambientColor: '#4ade80', particleColor: '#86efac', glowColor: '#22c55e' },
  whisper: { bgTop: '#1a0828', bgBot: '#1f1030', groundColor: '#2a1a3a', ambientColor: '#f9a8d4', particleColor: '#fce7f3', glowColor: '#ec4899' },
  skrag: { bgTop: '#1a0808', bgBot: '#200e0e', groundColor: '#2a1414', ambientColor: '#f87171', particleColor: '#fca5a5', glowColor: '#ef4444' },
  barnaby: { bgTop: '#1a1408', bgBot: '#201a0e', groundColor: '#2a2214', ambientColor: '#fbbf24', particleColor: '#fde68a', glowColor: '#d97706' },
  patches: { bgTop: '#081018', bgBot: '#0e1520', groundColor: '#14202a', ambientColor: '#60a5fa', particleColor: '#93c5fd', glowColor: '#3b82f6' },
};

// ── Distributor View ────────────────────────────────────

export class DistributorView {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private time = 0;
  private running = false;
  private animFrame = 0;

  private engine: GameEngine;
  onClose: (() => void) | null = null;

  // View state
  private mode: ViewMode = 'select';
  private activeNpcId: string | null = null;

  // NPC scene
  private npcX = 0;
  private npcY = 0;
  private particles: AmbientParticle[] = [];
  private flyingPotions: FlyingPotion[] = [];
  private flyingCoins: FlyingCoin[] = [];
  private speechText = '';
  private speechTime = 0;

  // Potion tray
  private potionSlots: { potion: Potion; idx: number; x: number; y: number; w: number; h: number }[] = [];
  private dragging: { idx: number; potion: Potion; x: number; y: number } | null = null;

  // UI
  private closeBtnX = 0;
  private closeBtnY = 0;
  private closeBtnR = 18;

  constructor(canvas: HTMLCanvasElement, engine: GameEngine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.engine = engine;
    this.resize();
    this.setupEvents();
    this.start();
  }

  private resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    let rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      const parent = this.canvas.parentElement;
      if (parent) rect = parent.getBoundingClientRect();
    }
    this.width = rect.width || window.innerWidth;
    this.height = rect.height || window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.closeBtnX = this.width - 30;
    this.closeBtnY = 24;
    this.npcX = this.width * 0.5;
    this.npcY = this.height * 0.32;
  }

  private enterNpcView(npcId: string): void {
    this.mode = 'npc';
    this.activeNpcId = npcId;
    this.particles = [];
    this.flyingPotions = [];
    this.flyingCoins = [];
    this.speechText = '';
    this.rebuildPotionSlots();

    // Seed ambient particles
    const theme = NPC_THEMES[npcId] || NPC_THEMES.grix;
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height * 0.7,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.15 - Math.random() * 0.3,
        size: 1 + Math.random() * 2,
        alpha: 0.1 + Math.random() * 0.2,
        color: theme.particleColor,
        life: Math.random() * 200,
        maxLife: 200 + Math.random() * 200,
      });
    }

    // Greeting
    const greetings: Record<string, string> = {
      grix: "Oi! Whatcha got for me?",
      whisper: "Hello, dear wizard~",
      skrag: "Heh heh... show me the goods.",
      barnaby: "Good day! Quality wares only.",
      patches: "Mrrrow.",
    };
    this.speechText = greetings[npcId] || 'Hello!';
    this.speechTime = this.time;
  }

  private rebuildPotionSlots(): void {
    this.potionSlots = [];
    const slotW = 64;
    const slotH = 78;
    const gap = 8;
    const startY = this.height - slotH - 16;
    const total = this.engine.inventory.length;
    const totalW = total * (slotW + gap) - gap;
    const startX = Math.max(12, (this.width - totalW) / 2);

    for (let i = 0; i < total; i++) {
      this.potionSlots.push({
        potion: this.engine.inventory[i],
        idx: i,
        x: startX + i * (slotW + gap),
        y: startY,
        w: slotW,
        h: slotH,
      });
    }
  }

  // ── Events ────────────────────────────────

  private setupEvents(): void {
    window.addEventListener('resize', () => this.resize());

    const getPos = (e: MouseEvent | Touch) => {
      const rect = this.canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    let touchActive = false;
    let dragMoved = false;

    const onDown = (x: number, y: number) => {
      dragMoved = false;

      if (this.mode === 'npc') {
        // Start drag from potion tray
        for (const slot of this.potionSlots) {
          if (x >= slot.x && x <= slot.x + slot.w && y >= slot.y && y <= slot.y + slot.h) {
            this.dragging = { idx: slot.idx, potion: slot.potion, x, y };
            return;
          }
        }
      }
    };

    const onMove = (x: number, y: number) => {
      if (this.dragging) {
        this.dragging.x = x;
        this.dragging.y = y;
        dragMoved = true;
      }
    };

    const onUp = (x: number, y: number) => {
      // Handle drag drop
      if (this.dragging && dragMoved) {
        const drag = this.dragging;
        this.dragging = null;

        if (this.activeNpcId) {
          // Check if dropped on NPC (upper area)
          const dist = Math.hypot(x - this.npcX, y - this.npcY);
          if (dist < 80) {
            this.assignPotion(drag);
            return;
          }
        }
        return;
      }
      this.dragging = null;

      // Tap actions
      // Close button
      if (Math.hypot(x - this.closeBtnX, y - this.closeBtnY) < this.closeBtnR + 10) {
        if (this.mode === 'npc') {
          this.mode = 'select';
          this.activeNpcId = null;
        } else {
          this.stop();
          this.onClose?.();
        }
        return;
      }

      if (this.mode === 'select') {
        this.handleSelectTap(x, y);
      } else if (this.mode === 'npc') {
        this.handleNpcTap(x, y);
      }
    };

    this.canvas.addEventListener('mousedown', (e) => { if (touchActive) return; const p = getPos(e); onDown(p.x, p.y); });
    this.canvas.addEventListener('mousemove', (e) => { if (touchActive) return; const p = getPos(e); onMove(p.x, p.y); });
    this.canvas.addEventListener('mouseup', (e) => { if (touchActive) return; const p = getPos(e); onUp(p.x, p.y); });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault(); touchActive = true;
      if (e.touches.length > 0) { const p = getPos(e.touches[0]); onDown(p.x, p.y); }
    });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) { const p = getPos(e.touches[0]); onMove(p.x, p.y); }
    });
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (e.changedTouches.length > 0) { const p = getPos(e.changedTouches[0]); onUp(p.x, p.y); }
      setTimeout(() => { touchActive = false; }, 300);
    });
  }

  private handleSelectTap(x: number, y: number): void {
    // Location cards
    const dists = Object.values(DISTRIBUTORS);
    const cardW = this.width - 32;
    const cardH = 64;
    const gap = 10;
    const startY = 60;

    for (let i = 0; i < dists.length; i++) {
      const cy = startY + i * (cardH + gap);
      if (x >= 16 && x <= 16 + cardW && y >= cy && y <= cy + cardH) {
        const d = this.engine.distributors[dists[i].id];
        if (!d) return;
        if (!d.unlocked) {
          if (this.engine.unlockDistributor(dists[i].id)) {
            playSuccessChime();
          }
          return;
        }
        this.enterNpcView(dists[i].id);
        return;
      }
    }
  }

  private handleNpcTap(x: number, y: number): void {
    if (!this.activeNpcId) return;
    const dist = this.engine.distributors[this.activeNpcId];
    if (!dist) return;

    // Collect gold button — must match draw position (npcY + 115)
    if (dist.goldEarned > 0) {
      const btnW = 160;
      const btnH = 42;
      const btnX = this.npcX - btnW / 2;
      const btnY = this.npcY + 115;
      if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
        const amount = this.engine.collectDistributorGold(this.activeNpcId);
        if (amount > 0) {
          playCoin();
          for (let i = 0; i < Math.min(amount / 3, 20); i++) {
            this.flyingCoins.push({
              x: this.npcX, y: this.npcY,
              vx: (Math.random() - 0.5) * 4,
              vy: -2.5 - Math.random() * 3,
              life: 50 + Math.random() * 40,
              size: 5 + Math.random() * 5,
            });
          }
          this.speechText = `Here's ${amount}g!`;
          this.speechTime = this.time;
        }
        return;
      }
    }

    // Tap NPC — random dialogue
    const npcDist = Math.hypot(x - this.npcX, y - this.npcY);
    if (npcDist < 60) {
      const lines: Record<string, string[]> = {
        grix: ["Business is business!", "Got anything spicy?", "Sell fast, ask later!", "The market's buzzing today."],
        whisper: ["The students love your work~", "Such lovely potions!", "I'll find them good homes.", "Magic is beautiful, isn't it?"],
        skrag: ["Nobody saw nothing.", "The good stuff sells itself.", "Keep it coming, wizard.", "Dark alleys, bright gold!"],
        barnaby: ["Only the finest, please.", "My clients expect quality.", "A gentleman's trade.", "Splendid craftsmanship!"],
        patches: ["Mrow?", "Purrr...", "*knocks potion off shelf*", "*stares judgmentally*", "Mrrrow!"],
      };
      const pool = lines[this.activeNpcId] || ["..."];
      this.speechText = pool[Math.floor(Math.random() * pool.length)];
      this.speechTime = this.time;
      playBubble(1.0);
    }
  }

  private assignPotion(drag: { idx: number; potion: Potion; x: number; y: number }): void {
    if (!this.activeNpcId) return;
    const d = this.engine.distributors[this.activeNpcId];
    if (!d || !d.unlocked) return;
    if (d.stock.length >= this.engine.getDistributorCapacity(d)) {
      this.speechText = "I'm full! Come back later.";
      this.speechTime = this.time;
      return;
    }
    if (this.engine.assignToDistributor(this.activeNpcId, drag.idx)) {
      playPlop();
      const catColors: Record<string, string> = { potion: '#a855f7', candy: '#fb923c', prank: '#f87171', enchant: '#60a5fa' };
      this.flyingPotions.push({
        x: drag.x, y: drag.y,
        targetX: this.npcX, targetY: this.npcY,
        color: catColors[drag.potion.category] || '#a855f7',
        landed: false,
        size: 14,
      });
      const responses: Record<string, string[]> = {
        grix: ["Nice!", "I'll move this quick!", "Cha-ching!"],
        whisper: ["Lovely~", "The students will adore this!", "Thank you, dear!"],
        skrag: ["Heh heh, perfect.", "Good stuff!", "Consider it sold."],
        barnaby: ["Excellent choice.", "Fine quality!", "My clients will be pleased."],
        patches: ["*purrs*", "Mrow!", "*nods approvingly*"],
      };
      const pool = responses[this.activeNpcId] || ["Thanks!"];
      this.speechText = pool[Math.floor(Math.random() * pool.length)];
      this.speechTime = this.time;
      this.rebuildPotionSlots();
    }
  }

  // ── Loop ──────────────────────────────────

  start(): void {
    if (this.running) return;
    this.running = true;
    const loop = (ts: number) => {
      this.time = ts * 0.001;
      this.update();
      this.draw();
      if (this.running) this.animFrame = requestAnimationFrame(loop);
    };
    this.animFrame = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.animFrame);
  }

  private update(): void {
    if (this.mode !== 'npc') return;

    // Ambient particles
    const theme = NPC_THEMES[this.activeNpcId || 'grix'] || NPC_THEMES.grix;
    for (const p of this.particles) {
      p.x += p.vx + Math.sin(this.time * 0.5 + p.y * 0.01) * 0.1;
      p.y += p.vy;
      p.life++;
      if (p.life > p.maxLife || p.y < -10) {
        p.x = Math.random() * this.width;
        p.y = this.height * 0.6 + Math.random() * this.height * 0.3;
        p.life = 0;
        p.color = theme.particleColor;
      }
    }

    // Flying potions
    for (const fp of this.flyingPotions) {
      if (fp.landed) continue;
      fp.x += (fp.targetX - fp.x) * 0.12;
      fp.y += (fp.targetY - fp.y) * 0.12;
      fp.size *= 0.97;
      if (Math.abs(fp.x - fp.targetX) < 3) fp.landed = true;
    }

    // Flying coins
    for (let i = this.flyingCoins.length - 1; i >= 0; i--) {
      const c = this.flyingCoins[i];
      c.x += c.vx; c.y += c.vy; c.vy += 0.08; c.life--;
      if (c.life <= 0) this.flyingCoins.splice(i, 1);
    }
  }

  // ── Draw ──────────────────────────────────

  private draw(): void {
    if (this.mode === 'select') {
      this.drawSelectScreen();
    } else {
      this.drawNpcScreen();
    }
  }

  // ── Location Select Screen ────────────────

  private drawSelectScreen(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const t = this.time;

    // Dark background
    ctx.fillStyle = '#080614';
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.fillStyle = '#e2ddf5';
    ctx.font = '700 18px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.fillText('Distributors', w / 2, 38);
    ctx.textAlign = 'start';

    // Location cards
    const dists = Object.values(DISTRIBUTORS);
    const cardW = w - 32;
    const cardH = 64;
    const gap = 10;
    const startY = 60;

    for (let i = 0; i < dists.length; i++) {
      const def = dists[i];
      const d = this.engine.distributors[def.id];
      const theme = NPC_THEMES[def.id] || NPC_THEMES.grix;
      const cy = startY + i * (cardH + gap);
      const locked = !d.unlocked;

      // Card bg with location color
      const cardGrad = ctx.createLinearGradient(16, cy, 16 + cardW, cy);
      cardGrad.addColorStop(0, locked ? '#1a1530' : theme.bgBot);
      cardGrad.addColorStop(1, locked ? '#0d0a1a' : theme.bgTop);
      ctx.fillStyle = cardGrad;
      this.roundRect(ctx, 16, cy, cardW, cardH, 12);
      ctx.fill();

      // Border
      ctx.strokeStyle = locked ? '#2d2555' : theme.glowColor + '60';
      ctx.lineWidth = 1;
      this.roundRect(ctx, 16, cy, cardW, cardH, 12);
      ctx.stroke();

      // NPC avatar circle
      ctx.globalAlpha = locked ? 0.3 : 1;
      const avX = 52;
      const avY = cy + cardH / 2;
      ctx.fillStyle = locked ? '#2d2555' : def.color + '30';
      ctx.beginPath();
      ctx.arc(avX, avY, 22, 0, Math.PI * 2);
      ctx.fill();
      // Simple face
      this.drawMiniNpc(ctx, avX, avY, def.id, 18, t + i);

      // Name + location
      ctx.fillStyle = locked ? '#5b4c8a' : '#e2ddf5';
      ctx.font = '600 14px Inter, sans-serif';
      ctx.fillText(def.name, 82, cy + 24);
      ctx.fillStyle = locked ? '#3d3060' : '#8b83a8';
      ctx.font = '500 11px Inter, sans-serif';
      ctx.fillText(def.location, 82, cy + 40);

      // Right side: stock or lock
      if (locked) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = '600 12px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`${def.unlockCost}g`, 16 + cardW - 16, cy + 28);
        ctx.fillStyle = '#8b83a8';
        ctx.font = '500 10px Inter, sans-serif';
        ctx.fillText('Tap to unlock', 16 + cardW - 16, cy + 42);
        ctx.textAlign = 'start';
      } else {
        const cap = this.engine.getDistributorCapacity(d);
        // Stock dots
        ctx.textAlign = 'right';
        if (d.goldEarned > 0) {
          ctx.fillStyle = '#fbbf24';
          ctx.font = '700 13px Inter, sans-serif';
          ctx.fillText(`${d.goldEarned}g`, 16 + cardW - 16, cy + 26);
          ctx.fillStyle = '#4ade80';
          ctx.font = '500 10px Inter, sans-serif';
          ctx.fillText('Ready to collect!', 16 + cardW - 16, cy + 42);
        } else {
          ctx.fillStyle = '#8b83a8';
          ctx.font = '500 11px Inter, sans-serif';
          ctx.fillText(`${d.stock.length}/${cap} stock`, 16 + cardW - 16, cy + 26);
          ctx.fillStyle = '#5b4c8a';
          ctx.font = '500 10px Inter, sans-serif';
          ctx.fillText(`${Math.round(def.cut * 100)}% cut · ${def.baseSellInterval}s/item`, 16 + cardW - 16, cy + 42);
        }
        ctx.textAlign = 'start';

        // Glowing gold indicator
        if (d.goldEarned > 0) {
          ctx.globalCompositeOperation = 'lighter';
          const gGrad = ctx.createRadialGradient(16 + cardW - 30, cy + cardH / 2, 0, 16 + cardW - 30, cy + cardH / 2, 30);
          gGrad.addColorStop(0, 'rgba(251,191,36,0.15)');
          gGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = gGrad;
          ctx.beginPath();
          ctx.arc(16 + cardW - 30, cy + cardH / 2, 30, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        }
      }

      ctx.globalAlpha = 1;
    }

    // Close button
    this.drawCloseButton(ctx);
  }

  // ── NPC Interaction Screen ────────────────

  private drawNpcScreen(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const t = this.time;
    if (!this.activeNpcId) return;

    const def = DISTRIBUTORS[this.activeNpcId];
    const dist = this.engine.distributors[this.activeNpcId];
    const theme = NPC_THEMES[this.activeNpcId] || NPC_THEMES.grix;
    if (!def || !dist) return;

    // ── Background scene ──
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, theme.bgTop);
    bgGrad.addColorStop(0.6, theme.bgBot);
    bgGrad.addColorStop(1, '#050308');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Zone-specific environment
    this.drawNpcEnvironment(ctx, w, h, t, this.activeNpcId, theme);

    // ── Ambient particles ──
    for (const p of this.particles) {
      const lifeR = p.life / p.maxLife;
      const a = p.alpha * (lifeR < 0.1 ? lifeR / 0.1 : lifeR > 0.8 ? (1 - lifeR) / 0.2 : 1);
      ctx.globalAlpha = a;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // ── NPC glow ──
    ctx.globalCompositeOperation = 'lighter';
    const nGrad = ctx.createRadialGradient(this.npcX, this.npcY, 0, this.npcX, this.npcY, 120);
    nGrad.addColorStop(0, `${theme.ambientColor}25`);
    nGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = nGrad;
    ctx.beginPath();
    ctx.arc(this.npcX, this.npcY, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // ── NPC character (big) ──
    const bob = Math.sin(t * 2) * 4;
    this.drawBigNpc(ctx, this.npcX, this.npcY + bob, this.activeNpcId, t);

    // ── Name plate ──
    ctx.fillStyle = '#e2ddf5';
    ctx.font = '700 16px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.fillText(def.name, this.npcX, this.npcY + 65);
    ctx.fillStyle = '#8b83a8';
    ctx.font = '500 11px Inter, sans-serif';
    ctx.fillText(def.location, this.npcX, this.npcY + 80);

    // ── Stock display ──
    const cap = this.engine.getDistributorCapacity(dist);
    ctx.fillStyle = '#8b83a8';
    ctx.font = '500 11px Inter, sans-serif';
    ctx.fillText(`Stock: ${dist.stock.length}/${cap} · Cut: ${Math.round(def.cut * 100)}%`, this.npcX, this.npcY + 95);

    // Stock dots
    for (let i = 0; i < cap; i++) {
      const dotX = this.npcX - (cap * 6) / 2 + i * 6 + 3;
      ctx.fillStyle = i < dist.stock.length ? theme.ambientColor : '#2d2555';
      ctx.beginPath();
      ctx.arc(dotX, this.npcY + 104, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Collect gold button ──
    if (dist.goldEarned > 0) {
      const btnW = 160;
      const btnH = 42;
      const btnX = this.npcX - btnW / 2;
      const btnY = this.npcY + 115;
      const bGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
      bGrad.addColorStop(0, '#b8860b');
      bGrad.addColorStop(1, '#fbbf24');
      ctx.fillStyle = bGrad;
      this.roundRect(ctx, btnX, btnY, btnW, btnH, 10);
      ctx.fill();
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 12;
      this.roundRect(ctx, btnX, btnY, btnW, btnH, 10);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#1a0a00';
      ctx.font = '700 14px Inter, sans-serif';
      ctx.fillText(`Collect ${dist.goldEarned}g`, this.npcX, btnY + 26);
    }

    ctx.textAlign = 'start';

    // ── Speech bubble ──
    if (this.speechText && t - this.speechTime < 3) {
      const elapsed = t - this.speechTime;
      const alpha = elapsed < 2.5 ? 1 : (3 - elapsed) / 0.5;
      ctx.globalAlpha = alpha;
      ctx.font = '500 13px Inter, sans-serif';
      const tw = ctx.measureText(this.speechText).width + 24;
      const th = 32;
      const bx = this.npcX - tw / 2;
      const by = this.npcY - 80;

      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      this.roundRect(ctx, bx, by, tw, th, 10);
      ctx.fill();
      // Tail
      ctx.beginPath();
      ctx.moveTo(this.npcX - 6, by + th);
      ctx.lineTo(this.npcX, by + th + 8);
      ctx.lineTo(this.npcX + 6, by + th);
      ctx.fill();

      ctx.fillStyle = '#1a1a2e';
      ctx.textAlign = 'center';
      ctx.fillText(this.speechText, this.npcX, by + 20);
      ctx.textAlign = 'start';
      ctx.globalAlpha = 1;
    }

    // ── Flying potions ──
    for (const fp of this.flyingPotions) {
      if (fp.landed) continue;
      ctx.globalCompositeOperation = 'lighter';
      const grad = ctx.createRadialGradient(fp.x, fp.y, 0, fp.x, fp.y, Math.max(1, fp.size * 1.5));
      grad.addColorStop(0, 'white');
      grad.addColorStop(0.4, fp.color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(fp.x, fp.y, Math.max(1, fp.size * 1.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }

    // ── Flying coins ──
    for (const c of this.flyingCoins) {
      ctx.globalAlpha = Math.min(1, c.life / 15);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(c.x, c.y, Math.max(1, c.size), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(c.x - 1, c.y - 1, Math.max(0.5, c.size * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── Dragged potion ──
    if (this.dragging) {
      const catColors: Record<string, string> = { potion: '#a855f7', candy: '#fb923c', prank: '#f87171', enchant: '#60a5fa' };
      const color = catColors[this.dragging.potion.category] || '#a855f7';
      ctx.globalCompositeOperation = 'lighter';
      const dGrad = ctx.createRadialGradient(this.dragging.x, this.dragging.y, 0, this.dragging.x, this.dragging.y, 30);
      dGrad.addColorStop(0, 'rgba(255,255,255,0.5)');
      dGrad.addColorStop(0.3, color);
      dGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = dGrad;
      ctx.beginPath();
      ctx.arc(this.dragging.x, this.dragging.y, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      // Drop zone
      const dd = Math.hypot(this.dragging.x - this.npcX, this.dragging.y - this.npcY);
      if (dd < 100) {
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.globalAlpha = 0.5 + Math.sin(t * 4) * 0.2;
        ctx.beginPath();
        ctx.arc(this.npcX, this.npcY, 55, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
    }

    // ── Potion tray ──
    this.drawPotionTray(ctx, w, h);

    // ── Back/Close button ──
    this.drawCloseButton(ctx);
  }

  // ── NPC Environment Backgrounds ───────────

  private drawNpcEnvironment(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, npcId: string, theme: NpcTheme): void {
    const groundY = h * 0.55;

    switch (npcId) {
      case 'grix': // Market Square — stalls, lanterns
        // Stall awning
        ctx.fillStyle = '#2d4a1a';
        ctx.fillRect(w * 0.1, h * 0.15, w * 0.8, h * 0.05);
        ctx.fillStyle = '#3a5a24';
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.moveTo(w * 0.1 + i * (w * 0.8 / 6), h * 0.2);
          ctx.lineTo(w * 0.1 + (i + 0.5) * (w * 0.8 / 6), h * 0.25);
          ctx.lineTo(w * 0.1 + (i + 1) * (w * 0.8 / 6), h * 0.2);
          ctx.fill();
        }
        // Crates
        ctx.fillStyle = '#3d2815';
        ctx.fillRect(w * 0.05, groundY - 25, 30, 25);
        ctx.fillRect(w * 0.85, groundY - 20, 25, 20);
        // Lantern glow
        ctx.globalCompositeOperation = 'lighter';
        for (const lx of [w * 0.2, w * 0.8]) {
          const lg = ctx.createRadialGradient(lx, h * 0.12, 0, lx, h * 0.12, 60);
          lg.addColorStop(0, 'rgba(251,191,36,0.1)');
          lg.addColorStop(1, 'transparent');
          ctx.fillStyle = lg;
          ctx.beginPath();
          ctx.arc(lx, h * 0.12, 60 + Math.sin(t * 4) * 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        break;

      case 'whisper': // Academy Gardens — flowers, trees, sparkles
        // Trees
        for (const tx of [w * 0.1, w * 0.85]) {
          ctx.fillStyle = '#2a1a3a';
          ctx.fillRect(tx - 4, groundY - 60, 8, 60);
          ctx.fillStyle = '#3a2a4a';
          ctx.beginPath();
          ctx.arc(tx, groundY - 70, 25, 0, Math.PI * 2);
          ctx.fill();
        }
        // Flowers
        for (let i = 0; i < 8; i++) {
          const fx = w * 0.15 + (i / 8) * w * 0.7;
          const fy = groundY - 5 + Math.sin(i * 2) * 3;
          ctx.fillStyle = ['#f9a8d4', '#c4b5fd', '#fde68a', '#93c5fd'][i % 4];
          ctx.globalAlpha = 0.5;
          ctx.beginPath();
          ctx.arc(fx, fy, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        break;

      case 'skrag': // Back Alleys — brick walls, shadows, dripping
        // Brick walls
        ctx.fillStyle = '#1a0e0e';
        ctx.fillRect(0, 0, w * 0.15, groundY);
        ctx.fillRect(w * 0.85, 0, w * 0.15, groundY);
        ctx.strokeStyle = '#0d0808';
        ctx.lineWidth = 0.5;
        for (let row = 0; row < groundY / 12; row++) {
          const off = (row % 2) * 10;
          for (let col = 0; col < 4; col++) {
            ctx.strokeRect(off + col * 20, row * 12, 18, 10);
            ctx.strokeRect(w - 60 + off + col * 20, row * 12, 18, 10);
          }
        }
        // Puddle reflection
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = theme.ambientColor;
        ctx.beginPath();
        ctx.ellipse(w * 0.6, groundY + 20, 30, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        break;

      case 'barnaby': // Noble District — columns, chandelier
        // Columns
        for (const cx of [w * 0.12, w * 0.88]) {
          ctx.fillStyle = '#2a2240';
          ctx.fillRect(cx - 8, h * 0.05, 16, groundY - h * 0.05);
          ctx.fillStyle = '#3a3250';
          ctx.fillRect(cx - 12, h * 0.05, 24, 10);
          ctx.fillRect(cx - 12, groundY - 10, 24, 10);
        }
        // Chandelier
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(w * 0.5, 0); ctx.lineTo(w * 0.5, 20); ctx.stroke();
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(w * 0.35, 25); ctx.lineTo(w * 0.65, 25); ctx.stroke();
        for (const dx of [-40, 0, 40]) {
          const flicker = Math.sin(t * 6 + dx) * 0.2;
          ctx.fillStyle = '#fbbf24';
          ctx.globalAlpha = 0.6 + flicker;
          ctx.beginPath();
          ctx.arc(w * 0.5 + dx, 20, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        break;

      case 'patches': // The Docks — wooden planks, ropes, water
        // Planks
        ctx.fillStyle = '#1a1820';
        for (let i = 0; i < 6; i++) {
          ctx.fillRect(0, groundY + i * 12, w, 10);
          ctx.strokeStyle = '#0f0e18';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(0, groundY + i * 12, w, 10);
        }
        // Water shimmer at bottom
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = theme.ambientColor;
        for (let i = 0; i < 8; i++) {
          const rx = (i * 60 + t * 15) % w;
          ctx.fillRect(rx, groundY + 50 + Math.sin(t + i) * 3, 35, 2);
        }
        ctx.globalAlpha = 1;
        // Rope
        ctx.strokeStyle = '#3a3020';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w * 0.05, h * 0.1);
        ctx.quadraticCurveTo(w * 0.15, h * 0.2, w * 0.1, h * 0.3);
        ctx.stroke();
        break;
    }

    // Ground
    ctx.fillStyle = theme.groundColor;
    ctx.fillRect(0, groundY, w, h - groundY);
  }

  // ── Big NPC Character ─────────────────────

  private drawBigNpc(ctx: CanvasRenderingContext2D, x: number, y: number, npcId: string, t: number): void {
    const colors: Record<string, { body: string; face: string; eye: string }> = {
      grix: { body: '#2d5a2d', face: '#4ade80', eye: '#fbbf24' },
      whisper: { body: '#d946a8', face: '#fce7f3', eye: '#ec4899' },
      skrag: { body: '#7f1d1d', face: '#dc2626', eye: '#fbbf24' },
      barnaby: { body: '#78350f', face: '#fde68a', eye: '#1a1a2e' },
      patches: { body: '#c2410c', face: '#fb923c', eye: '#fef3c7' },
    };
    const c = colors[npcId] || colors.grix;
    const r = 38; // head radius

    // Body
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.ellipse(x, y + r + 15, r * 0.8, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // Face
    ctx.fillStyle = c.face;
    ctx.beginPath();
    ctx.arc(x, y - 2, r * 0.85, 0, Math.PI * 2);
    ctx.fill();

    // NPC-specific features
    if (npcId === 'grix') {
      // Pointy ears
      ctx.fillStyle = c.face;
      ctx.beginPath(); ctx.moveTo(x - r, y - 5); ctx.lineTo(x - r - 14, y - 18); ctx.lineTo(x - r + 8, y - 12); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + r, y - 5); ctx.lineTo(x + r + 14, y - 18); ctx.lineTo(x + r - 8, y - 12); ctx.fill();
    } else if (npcId === 'whisper') {
      // Wings
      ctx.fillStyle = '#f9a8d4';
      ctx.globalAlpha = 0.4;
      const wingFlap = Math.sin(t * 4) * 5;
      ctx.beginPath(); ctx.ellipse(x - r - 10, y - 10, 18, 28 + wingFlap, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + r + 10, y - 10, 18, 28 + wingFlap, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (npcId === 'skrag') {
      // Horns
      ctx.fillStyle = '#4a0e0e';
      ctx.beginPath(); ctx.moveTo(x - 15, y - r + 5); ctx.lineTo(x - 20, y - r - 18); ctx.lineTo(x - 8, y - r + 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 15, y - r + 5); ctx.lineTo(x + 20, y - r - 18); ctx.lineTo(x + 8, y - r + 2); ctx.fill();
    } else if (npcId === 'barnaby') {
      // Hat
      ctx.fillStyle = '#4a3020';
      ctx.fillRect(x - 25, y - r - 5, 50, 8);
      ctx.fillRect(x - 18, y - r - 22, 36, 20);
    } else if (npcId === 'patches') {
      // Ears
      ctx.fillStyle = c.face;
      ctx.beginPath(); ctx.moveTo(x - 18, y - r + 8); ctx.lineTo(x - 12, y - r - 16); ctx.lineTo(x - 4, y - r + 5); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 18, y - r + 8); ctx.lineTo(x + 12, y - r - 16); ctx.lineTo(x + 4, y - r + 5); ctx.fill();
      // Inner ear
      ctx.fillStyle = '#fce7f3';
      ctx.beginPath(); ctx.moveTo(x - 15, y - r + 6); ctx.lineTo(x - 12, y - r - 10); ctx.lineTo(x - 7, y - r + 4); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 15, y - r + 6); ctx.lineTo(x + 12, y - r - 10); ctx.lineTo(x + 7, y - r + 4); ctx.fill();
    }

    // Eyes
    const eyeSpread = 11;
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.ellipse(x - eyeSpread, y - 6, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + eyeSpread, y - 6, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
    // Pupils (look toward mouse/potion)
    let lookX = 0;
    if (this.dragging) lookX = Math.sign(this.dragging.x - x) * 2;
    ctx.fillStyle = c.eye;
    ctx.beginPath(); ctx.arc(x - eyeSpread + lookX, y - 5, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + eyeSpread + lookX, y - 5, 5, 0, Math.PI * 2); ctx.fill();
    // Shine
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(x - eyeSpread - 1 + lookX, y - 8, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + eyeSpread - 1 + lookX, y - 8, 2.5, 0, Math.PI * 2); ctx.fill();

    // Mouth
    ctx.strokeStyle = this.darken(c.face, 60);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y + 10, 8, 0.1, Math.PI - 0.1);
    ctx.stroke();
  }

  private drawMiniNpc(ctx: CanvasRenderingContext2D, x: number, y: number, npcId: string, r: number, t: number): void {
    const colors: Record<string, { face: string; eye: string }> = {
      grix: { face: '#4ade80', eye: '#fbbf24' },
      whisper: { face: '#fce7f3', eye: '#ec4899' },
      skrag: { face: '#dc2626', eye: '#fbbf24' },
      barnaby: { face: '#fde68a', eye: '#1a1a2e' },
      patches: { face: '#fb923c', eye: '#fef3c7' },
    };
    const c = colors[npcId] || colors.grix;

    ctx.fillStyle = c.face;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = c.eye;
    ctx.beginPath(); ctx.arc(x - 5, y - 3, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 5, y - 3, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(x - 5.5, y - 4.5, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 4.5, y - 4.5, 1.2, 0, Math.PI * 2); ctx.fill();
  }

  // ── Potion Tray ───────────────────────────

  private drawPotionTray(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const trayY = h - 106;
    ctx.fillStyle = 'rgba(10, 8, 24, 0.75)';
    ctx.fillRect(0, trayY, w, 106);
    ctx.strokeStyle = '#2d2555';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, trayY); ctx.lineTo(w, trayY); ctx.stroke();

    ctx.fillStyle = '#8b83a8';
    ctx.font = '500 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Drag potions to give them', w / 2, trayY + 14);
    ctx.textAlign = 'start';

    if (this.potionSlots.length === 0) {
      ctx.fillStyle = '#5b4c8a';
      ctx.font = '500 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No potions — brew some first!', w / 2, trayY + 55);
      ctx.textAlign = 'start';
      return;
    }

    const catColors: Record<string, string> = { potion: '#a855f7', candy: '#fb923c', prank: '#f87171', enchant: '#60a5fa' };

    for (const slot of this.potionSlots) {
      ctx.fillStyle = '#1e1838';
      ctx.strokeStyle = '#2d2555';
      ctx.lineWidth = 1;
      this.roundRect(ctx, slot.x, slot.y, slot.w, slot.h, 8);
      ctx.fill();
      ctx.stroke();

      const color = catColors[slot.potion.category] || '#a855f7';
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(slot.x + slot.w / 2, slot.y + 26, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(slot.x + slot.w / 2 - 3, slot.y + 23, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#e2ddf5';
      ctx.font = '500 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      const name = slot.potion.name.length > 9 ? slot.potion.name.slice(0, 8) + '.' : slot.potion.name;
      ctx.fillText(name, slot.x + slot.w / 2, slot.y + 50);
      ctx.fillStyle = '#8b83a8';
      ctx.font = '500 9px Inter, sans-serif';
      ctx.fillText(`${slot.potion.sellPrice}g`, slot.x + slot.w / 2, slot.y + 64);
      ctx.textAlign = 'start';
    }
  }

  // ── UI Elements ───────────────────────────

  private drawCloseButton(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(30, 24, 56, 0.8)';
    ctx.beginPath();
    ctx.arc(this.closeBtnX, this.closeBtnY, this.closeBtnR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8b83a8';
    ctx.lineWidth = 2;
    const cs = 7;
    ctx.beginPath();
    ctx.moveTo(this.closeBtnX - cs, this.closeBtnY - cs);
    ctx.lineTo(this.closeBtnX + cs, this.closeBtnY + cs);
    ctx.moveTo(this.closeBtnX + cs, this.closeBtnY - cs);
    ctx.lineTo(this.closeBtnX - cs, this.closeBtnY + cs);
    ctx.stroke();
  }

  // ── Helpers ───────────────────────────────

  private darken(hex: string, amount: number): string {
    const v = parseInt(hex.slice(1), 16);
    const r = Math.max(0, ((v >> 16) & 255) - amount);
    const g = Math.max(0, ((v >> 8) & 255) - amount);
    const b = Math.max(0, (v & 255) - amount);
    return `rgb(${r},${g},${b})`;
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
