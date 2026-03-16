import { GameEngine, type Potion, type DistributorState } from '../engine/GameEngine';
import { DISTRIBUTORS } from '../data/distributors';
import { playCoin, playPlop, playSuccessChime } from '../audio/SoundEngine';
import { getRecipe } from '../data/recipes';

// ── Types ───────────────────────────────────────────────

interface NpcVisual {
  id: string;
  name: string;
  x: number; y: number;
  color: string;
  bodyColor: string;
  eyeColor: string;
  bobPhase: number;
  // Speech bubble
  speech: string;
  speechTime: number;
}

interface FlyingPotion {
  x: number; y: number;
  targetX: number; targetY: number;
  color: string;
  name: string;
  landed: boolean;
  size: number;
}

interface FlyingCoin {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  size: number;
}

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

  // NPCs
  private npcs: NpcVisual[] = [];
  private selectedNpc: string | null = null;

  // Potion tray
  private potionSlots: { potion: Potion; idx: number; x: number; y: number; w: number; h: number }[] = [];
  private trayScrollOffset = 0;

  // Dragging
  private dragging: { idx: number; potion: Potion; x: number; y: number } | null = null;

  // Animations
  private flyingPotions: FlyingPotion[] = [];
  private flyingCoins: FlyingCoin[] = [];

  // UI
  private closeBtnX = 0;
  private closeBtnY = 0;
  private closeBtnR = 18;
  private collectBtnNpc: string | null = null;

  constructor(canvas: HTMLCanvasElement, engine: GameEngine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.engine = engine;
    this.resize();
    this.buildNpcs();
    this.rebuildPotionSlots();
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
  }

  private buildNpcs(): void {
    this.npcs = [];
    const dists = Object.values(this.engine.distributors);
    const w = this.width;
    const count = dists.length;
    const spacing = Math.min(w / (count + 1), 90);
    const startX = (w - spacing * (count - 1)) / 2;

    const npcColors: Record<string, { body: string; eye: string }> = {
      grix: { body: '#2d5a2d', eye: '#fbbf24' },
      whisper: { body: '#fce7f3', eye: '#ec4899' },
      skrag: { body: '#7f1d1d', eye: '#fbbf24' },
      barnaby: { body: '#78350f', eye: '#1a1a2e' },
      patches: { body: '#c2410c', eye: '#fef3c7' },
    };

    for (let i = 0; i < count; i++) {
      const dist = dists[i];
      const colors = npcColors[dist.id] || { body: '#4a3d6a', eye: '#fbbf24' };
      this.npcs.push({
        id: dist.id,
        name: dist.def.name.split(' ')[0], // First name only
        x: startX + i * spacing,
        y: this.height * 0.35,
        color: dist.def.color,
        bodyColor: colors.body,
        eyeColor: colors.eye,
        bobPhase: i * 1.3,
        speech: '',
        speechTime: 0,
      });
    }
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

    const onDown = (x: number, y: number) => {
      // Close
      if (Math.hypot(x - this.closeBtnX, y - this.closeBtnY) < this.closeBtnR + 8) {
        this.stop();
        this.onClose?.();
        return;
      }

      // Collect gold button
      if (this.collectBtnNpc) {
        const dist = this.engine.distributors[this.collectBtnNpc];
        if (dist && dist.goldEarned > 0) {
          const btnW = 120;
          const btnH = 34;
          const npc = this.npcs.find(n => n.id === this.collectBtnNpc);
          if (npc) {
            const btnX = npc.x - btnW / 2;
            const btnY = npc.y + 55;
            if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
              const amount = this.engine.collectDistributorGold(this.collectBtnNpc);
              if (amount > 0) {
                playCoin();
                // Spawn flying coins
                for (let i = 0; i < Math.min(amount / 5, 15); i++) {
                  this.flyingCoins.push({
                    x: npc.x, y: npc.y,
                    vx: (Math.random() - 0.5) * 3,
                    vy: -2 - Math.random() * 3,
                    life: 40 + Math.random() * 30,
                    size: 4 + Math.random() * 4,
                  });
                }
                this.setSpeech(npc, `+${amount}g!`);
              }
              return;
            }
          }
        }
      }

      // Tap NPC to select/deselect
      for (const npc of this.npcs) {
        const dist = Math.hypot(x - npc.x, y - npc.y);
        if (dist < 40) {
          const d = this.engine.distributors[npc.id];
          if (!d.unlocked) {
            // Unlock
            if (this.engine.unlockDistributor(npc.id)) {
              playSuccessChime();
              this.setSpeech(npc, 'Ready!');
            }
            return;
          }
          this.selectedNpc = this.selectedNpc === npc.id ? null : npc.id;
          this.collectBtnNpc = (d.goldEarned > 0 && this.selectedNpc === npc.id) ? npc.id : null;
          return;
        }
      }

      // Potion slots — start drag
      for (const slot of this.potionSlots) {
        if (x >= slot.x && x <= slot.x + slot.w && y >= slot.y && y <= slot.y + slot.h) {
          this.dragging = { idx: slot.idx, potion: slot.potion, x, y };
          return;
        }
      }

      // Tap empty area — deselect
      this.selectedNpc = null;
      this.collectBtnNpc = null;
    };

    const onMove = (x: number, y: number) => {
      if (this.dragging) {
        this.dragging.x = x;
        this.dragging.y = y;
      }
    };

    const onUp = (x: number, y: number) => {
      if (!this.dragging) return;
      const drag = this.dragging;
      this.dragging = null;

      // Check if dropped on an NPC
      for (const npc of this.npcs) {
        const dist = Math.hypot(x - npc.x, y - npc.y);
        if (dist < 50) {
          const d = this.engine.distributors[npc.id];
          if (!d.unlocked) continue;
          if (d.stock.length >= this.engine.getDistributorCapacity(d)) {
            this.setSpeech(npc, 'Full!');
            return;
          }
          // Assign potion
          if (this.engine.assignToDistributor(npc.id, drag.idx)) {
            playPlop();
            // Flying potion animation
            const catColors: Record<string, string> = { potion: '#a855f7', candy: '#fb923c', prank: '#f87171', enchant: '#60a5fa' };
            this.flyingPotions.push({
              x: drag.x, y: drag.y,
              targetX: npc.x, targetY: npc.y,
              color: catColors[drag.potion.category] || '#a855f7',
              name: drag.potion.name,
              landed: false,
              size: 12,
            });
            this.setSpeech(npc, 'Thanks!');
            this.rebuildPotionSlots();
          }
          return;
        }
      }
    };

    this.canvas.addEventListener('click', (e) => { if (touchActive) return; const p = getPos(e); onDown(p.x, p.y); });
    this.canvas.addEventListener('mousedown', (e) => { if (touchActive) return; });
    this.canvas.addEventListener('mousemove', (e) => { if (touchActive) return; const p = getPos(e); onMove(p.x, p.y); });
    this.canvas.addEventListener('mouseup', (e) => { if (touchActive) return; const p = getPos(e); onUp(p.x, p.y); });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      touchActive = true;
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

  private setSpeech(npc: NpcVisual, text: string): void {
    npc.speech = text;
    npc.speechTime = this.time;
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
    // Flying potions
    for (const fp of this.flyingPotions) {
      if (fp.landed) continue;
      fp.x += (fp.targetX - fp.x) * 0.12;
      fp.y += (fp.targetY - fp.y) * 0.12;
      fp.size *= 0.97;
      if (Math.abs(fp.x - fp.targetX) < 3 && Math.abs(fp.y - fp.targetY) < 3) {
        fp.landed = true;
      }
    }

    // Flying coins
    for (let i = this.flyingCoins.length - 1; i >= 0; i--) {
      const c = this.flyingCoins[i];
      c.x += c.vx;
      c.y += c.vy;
      c.vy += 0.1;
      c.life--;
      if (c.life <= 0) this.flyingCoins.splice(i, 1);
    }
  }

  // ── Draw ──────────────────────────────────

  private draw(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const t = this.time;

    // Background — dark street scene
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0a0818');
    bgGrad.addColorStop(0.5, '#0f0d1f');
    bgGrad.addColorStop(1, '#0a0812');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Cobblestone ground
    const groundY = h * 0.55;
    ctx.fillStyle = '#1a1520';
    ctx.fillRect(0, groundY, w, h - groundY);
    // Stone pattern
    ctx.strokeStyle = '#0f0d18';
    ctx.lineWidth = 0.5;
    for (let row = 0; row < 8; row++) {
      const ry = groundY + row * 16;
      const offset = (row % 2) * 18;
      for (let col = 0; col < w / 36 + 1; col++) {
        ctx.strokeRect(offset + col * 36, ry, 34, 14);
      }
    }

    // Lantern lights along the top
    for (let i = 0; i < 3; i++) {
      const lx = w * 0.2 + i * w * 0.3;
      const ly = h * 0.08;
      ctx.globalCompositeOperation = 'lighter';
      const lGrad = ctx.createRadialGradient(lx, ly, 0, lx, ly, 80);
      lGrad.addColorStop(0, 'rgba(251,191,36,0.12)');
      lGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = lGrad;
      ctx.beginPath();
      ctx.arc(lx, ly, 80 + Math.sin(t * 4 + i) * 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // Lantern body
      ctx.fillStyle = '#92400e';
      ctx.fillRect(lx - 4, ly - 8, 8, 12);
      ctx.fillStyle = '#fbbf24';
      ctx.globalAlpha = 0.6 + Math.sin(t * 6 + i) * 0.2;
      ctx.fillRect(lx - 3, ly - 6, 6, 8);
      ctx.globalAlpha = 1;
    }

    // ── Draw NPCs ──
    for (const npc of this.npcs) {
      const d = this.engine.distributors[npc.id];
      this.drawNpc(ctx, npc, d, t);
    }

    // ── Flying potions ──
    for (const fp of this.flyingPotions) {
      if (fp.landed) continue;
      ctx.globalCompositeOperation = 'lighter';
      const grad = ctx.createRadialGradient(fp.x, fp.y, 0, fp.x, fp.y, fp.size * 1.5);
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
      const alpha = Math.min(1, c.life / 15);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(c.x, c.y, Math.max(1, c.size), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b8860b';
      ctx.beginPath();
      ctx.arc(c.x, c.y, Math.max(0.5, c.size * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── Dragged potion ──
    if (this.dragging) {
      const dx = this.dragging.x;
      const dy = this.dragging.y;
      const catColors: Record<string, string> = { potion: '#a855f7', candy: '#fb923c', prank: '#f87171', enchant: '#60a5fa' };
      const color = catColors[this.dragging.potion.category] || '#a855f7';
      ctx.globalCompositeOperation = 'lighter';
      const dGrad = ctx.createRadialGradient(dx, dy, 0, dx, dy, 30);
      dGrad.addColorStop(0, 'rgba(255,255,255,0.5)');
      dGrad.addColorStop(0.3, color);
      dGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = dGrad;
      ctx.beginPath();
      ctx.arc(dx, dy, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      // Highlight closest NPC
      for (const npc of this.npcs) {
        const dist = Math.hypot(dx - npc.x, dy - npc.y);
        if (dist < 60) {
          ctx.strokeStyle = '#4ade80';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 4]);
          ctx.globalAlpha = 0.5 + Math.sin(t * 4) * 0.2;
          ctx.beginPath();
          ctx.arc(npc.x, npc.y, 45, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
          break;
        }
      }
    }

    // ── Potion tray ──
    this.drawPotionTray(ctx, w, h);

    // ── Close button ──
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

  // ── NPC Drawing ───────────────────────────

  private drawNpc(ctx: CanvasRenderingContext2D, npc: NpcVisual, dist: DistributorState, t: number): void {
    const x = npc.x;
    const bob = Math.sin(t * 2 + npc.bobPhase) * 3;
    const y = npc.y + bob;
    const selected = this.selectedNpc === npc.id;
    const locked = !dist.unlocked;
    const cap = this.engine.getDistributorCapacity(dist);

    // Selection glow
    if (selected) {
      ctx.globalCompositeOperation = 'lighter';
      const selGrad = ctx.createRadialGradient(x, y, 0, x, y, 55);
      selGrad.addColorStop(0, `rgba(${this.hexToRgb(npc.color)},0.15)`);
      selGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = selGrad;
      ctx.beginPath();
      ctx.arc(x, y, 55, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.globalAlpha = locked ? 0.4 : 1;

    // Body (simple round character)
    ctx.fillStyle = npc.bodyColor;
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    // Face highlight
    ctx.fillStyle = this.lighten(npc.bodyColor, 30);
    ctx.beginPath();
    ctx.arc(x, y - 4, 18, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.ellipse(x - 6, y - 5, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 6, y - 5, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Pupils
    ctx.fillStyle = npc.eyeColor;
    ctx.beginPath();
    ctx.arc(x - 5, y - 4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 7, y - 4, 3, 0, Math.PI * 2);
    ctx.fill();
    // Eye shine
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x - 6, y - 6, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 6, y - 6, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    ctx.strokeStyle = this.darken(npc.bodyColor, 40);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y + 4, 5, 0.1, Math.PI - 0.1);
    ctx.stroke();

    ctx.globalAlpha = 1;

    // Name
    ctx.fillStyle = locked ? '#4a3d6a' : '#e2ddf5';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(npc.name, x, y + 38);

    if (locked) {
      // Lock + price
      ctx.fillStyle = '#fbbf24';
      ctx.font = '600 10px Inter, sans-serif';
      ctx.fillText(`Unlock ${dist.def.unlockCost}g`, x, y + 50);
    } else {
      // Stock info
      ctx.fillStyle = '#8b83a8';
      ctx.font = '500 10px Inter, sans-serif';
      ctx.fillText(`${dist.stock.length}/${cap}`, x, y + 50);

      // Stock dots
      for (let i = 0; i < cap; i++) {
        const dotX = x - (cap * 5) / 2 + i * 5 + 2.5;
        ctx.fillStyle = i < dist.stock.length ? npc.color : '#2d2555';
        ctx.beginPath();
        ctx.arc(dotX, y + 57, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Gold earned indicator
      if (dist.goldEarned > 0 && selected) {
        const btnW = 120;
        const btnH = 34;
        const btnX = x - btnW / 2;
        const btnY = y + 65;
        const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
        btnGrad.addColorStop(0, '#b8860b');
        btnGrad.addColorStop(1, '#fbbf24');
        ctx.fillStyle = btnGrad;
        this.roundRect(ctx, btnX, btnY, btnW, btnH, 8);
        ctx.fill();
        ctx.fillStyle = '#1a0a00';
        ctx.font = '600 12px Inter, sans-serif';
        ctx.fillText(`Collect ${dist.goldEarned}g`, x, btnY + 21);
        this.collectBtnNpc = npc.id;
      } else if (dist.goldEarned > 0) {
        // Pulsing gold indicator
        ctx.globalAlpha = 0.5 + Math.sin(t * 3) * 0.3;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(x + 18, y - 18, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b8860b';
        ctx.font = '700 7px Inter, sans-serif';
        ctx.fillText('$', x + 18, y - 16);
        ctx.globalAlpha = 1;
      }
    }

    // Speech bubble
    if (npc.speech && t - npc.speechTime < 2) {
      const bubbleAlpha = t - npc.speechTime < 1.5 ? 1 : (2 - (t - npc.speechTime)) / 0.5;
      ctx.globalAlpha = bubbleAlpha;
      const bw = ctx.measureText(npc.speech).width + 16;
      const bh = 26;
      const bx = x - bw / 2;
      const by = y - 48;
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      this.roundRect(ctx, bx, by, bw, bh, 8);
      ctx.fill();
      // Tail
      ctx.beginPath();
      ctx.moveTo(x - 5, by + bh);
      ctx.lineTo(x, by + bh + 6);
      ctx.lineTo(x + 5, by + bh);
      ctx.fill();
      ctx.fillStyle = '#1a1a2e';
      ctx.font = '600 11px Inter, sans-serif';
      ctx.fillText(npc.speech, x, by + 17);
      ctx.globalAlpha = 1;
    }

    ctx.textAlign = 'start';
  }

  // ── Potion Tray ───────────────────────────

  private drawPotionTray(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const trayY = h - 106;
    ctx.fillStyle = 'rgba(10, 8, 24, 0.7)';
    ctx.fillRect(0, trayY, w, 106);
    ctx.strokeStyle = '#2d2555';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, trayY);
    ctx.lineTo(w, trayY);
    ctx.stroke();

    ctx.fillStyle = '#8b83a8';
    ctx.font = '500 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Drag potions to a distributor', w / 2, trayY + 14);
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

      // Potion orb
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

      // Name
      ctx.fillStyle = '#e2ddf5';
      ctx.font = '500 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      const name = slot.potion.name.length > 9 ? slot.potion.name.slice(0, 8) + '.' : slot.potion.name;
      ctx.fillText(name, slot.x + slot.w / 2, slot.y + 50);

      // Quality + price
      ctx.fillStyle = '#8b83a8';
      ctx.font = '500 9px Inter, sans-serif';
      ctx.fillText(`${slot.potion.quality.slice(0, 3)} · ${slot.potion.sellPrice}g`, slot.x + slot.w / 2, slot.y + 64);

      ctx.textAlign = 'start';
    }
  }

  // ── Helpers ───────────────────────────────

  private hexToRgb(hex: string): string {
    if (hex.startsWith('#') && hex.length >= 7) {
      const v = parseInt(hex.slice(1, 7), 16);
      return `${(v >> 16) & 255},${(v >> 8) & 255},${v & 255}`;
    }
    return '168,85,247';
  }

  private lighten(hex: string, amount: number): string {
    const v = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((v >> 16) & 255) + amount);
    const g = Math.min(255, ((v >> 8) & 255) + amount);
    const b = Math.min(255, (v & 255) + amount);
    return `rgb(${r},${g},${b})`;
  }

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
