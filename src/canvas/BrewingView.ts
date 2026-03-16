import { GameEngine, type Potion } from '../engine/GameEngine';
import { getIngredient, type Ingredient } from '../data/ingredients';
import { playPlop, playSizzle, startBubbling, stopBubbling, playPour, playSuccessChime, playMasterworkFanfare, playBubble } from '../audio/SoundEngine';

// ── Types ───────────────────────────────────────────────

interface IngredientSlot {
  id: string;
  ing: Ingredient;
  count: number;
  // Layout (set in layout())
  x: number; y: number; w: number; h: number;
}

interface DroppedIngredient {
  id: string;
  color: string;
  // Animation
  x: number; y: number;
  targetX: number; targetY: number;
  landed: boolean;
  ripple: number; // 0 = no ripple, counts up
  size: number;
}

interface LiquidSwirl {
  angle: number; r: number; color: string; size: number; life: number;
}

interface Spark {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
}

type BrewPhase = 'idle' | 'brewing' | 'result';

// ── Brewing View ────────────────────────────────────────

export class BrewingView {
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

  // Cauldron
  private potCenterX = 0;
  private potCenterY = 0;
  private potRadius = 0;

  // Ingredients
  private slots: IngredientSlot[] = [];
  private selectedIngredients: string[] = [];
  private dropped: DroppedIngredient[] = [];

  // Dragging
  private dragging: { id: string; x: number; y: number; offsetX: number; offsetY: number } | null = null;

  // Liquid
  private liquidColor = '#2d2555';
  private liquidBubbles: { x: number; y: number; r: number; life: number }[] = [];
  private swirls: LiquidSwirl[] = [];

  // Brew state
  private phase: BrewPhase = 'idle';
  private brewStartTime = 0;
  private sparks: Spark[] = [];
  private resultPotion: Potion | null = null;
  private resultAlpha = 0;

  // UI
  private brewBtnY = 0;
  private brewBtnH = 44;
  private closeBtnX = 0;
  private closeBtnY = 0;
  private closeBtnR = 18;
  private scrollOffset = 0;
  private canBrew = false;
  private recipePreview: string | null = null;

  constructor(canvas: HTMLCanvasElement, engine: GameEngine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.engine = engine;
    this.resize();
    this.setupEvents();
    this.rebuildSlots();
    this.start();
  }

  // ── Lifecycle ─────────────────────────────

  private resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    let rect = this.canvas.getBoundingClientRect();
    // Fallback: if canvas has no layout yet, use parent dimensions
    if (rect.width === 0 || rect.height === 0) {
      const parent = this.canvas.parentElement;
      if (parent) rect = parent.getBoundingClientRect();
    }
    this.width = rect.width || window.innerWidth;
    this.height = rect.height || window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.layout();
  }

  private layout(): void {
    const w = this.width;
    const h = this.height;

    // Cauldron centered in upper portion
    this.potRadius = Math.min(w * 0.32, h * 0.2, 140);
    this.potCenterX = w * 0.5;
    this.potCenterY = h * 0.32;

    // Close button top-right
    this.closeBtnX = w - 30;
    this.closeBtnY = 24;

    // Brew button
    this.brewBtnY = this.potCenterY + this.potRadius + 30;

    // Ingredient slots in scrollable row at bottom
    this.layoutSlots();
  }

  private layoutSlots(): void {
    const slotW = 72;
    const slotH = 88;
    const gap = 8;
    const startY = this.height - slotH - 20;
    const totalW = this.slots.length * (slotW + gap) - gap;
    const startX = Math.max(12, (this.width - totalW) / 2);

    for (let i = 0; i < this.slots.length; i++) {
      this.slots[i].x = startX + i * (slotW + gap) - this.scrollOffset;
      this.slots[i].y = startY;
      this.slots[i].w = slotW;
      this.slots[i].h = slotH;
    }
  }

  private rebuildSlots(): void {
    this.slots = [];
    for (const [id, count] of Object.entries(this.engine.ingredients)) {
      if (count <= 0) continue;
      const ing = getIngredient(id);
      if (!ing) continue;
      const used = this.selectedIngredients.filter(s => s === id).length;
      const available = count - used;
      if (available <= 0) continue;
      this.slots.push({ id, ing, count: available, x: 0, y: 0, w: 0, h: 0 });
    }
    this.layoutSlots();
    this.updatePreview();
  }

  private updatePreview(): void {
    if (this.selectedIngredients.length >= 2) {
      const recipe = this.engine.getBrewableRecipe(this.selectedIngredients);
      this.recipePreview = recipe ? recipe.name : null;
      this.canBrew = recipe !== null && this.engine.mana >= (5 + Math.floor(recipe.brewTime / 3));
    } else {
      this.recipePreview = null;
      this.canBrew = false;
    }
  }

  // ── Events ────────────────────────────────

  private setupEvents(): void {
    window.addEventListener('resize', () => this.resize());

    const getPos = (e: MouseEvent | Touch) => {
      const rect = this.canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    // ── Pointer down (mouse + touch) ──
    const onDown = (x: number, y: number) => {
      // Close button
      if (Math.hypot(x - this.closeBtnX, y - this.closeBtnY) < this.closeBtnR + 8) {
        this.stop();
        this.onClose?.();
        return;
      }

      // Brew button
      if (this.canBrew && this.phase === 'idle') {
        const btnW = 180;
        const btnX = this.width / 2 - btnW / 2;
        if (x >= btnX && x <= btnX + btnW && y >= this.brewBtnY && y <= this.brewBtnY + this.brewBtnH) {
          this.doBrew();
          return;
        }
      }

      // Result: tap to close
      if (this.phase === 'result') {
        this.stop();
        this.onClose?.();
        return;
      }

      // Check ingredient slots
      for (const slot of this.slots) {
        if (x >= slot.x && x <= slot.x + slot.w && y >= slot.y && y <= slot.y + slot.h) {
          if (this.selectedIngredients.length >= 3 || this.phase !== 'idle') return;
          this.dragging = {
            id: slot.id,
            x, y,
            offsetX: x - slot.x - slot.w / 2,
            offsetY: y - slot.y - slot.h / 2,
          };
          return;
        }
      }
    };

    const onMove = (x: number, y: number) => {
      if (this.dragging) {
        this.dragging.x = x;
        this.dragging.y = y;
      }
    };

    const onUp = (x: number, y: number) => {
      if (!this.dragging) return;
      const dragId = this.dragging.id;
      this.dragging = null;

      // Check if dropped on cauldron
      const dist = Math.hypot(x - this.potCenterX, y - this.potCenterY);
      if (dist < this.potRadius * 1.2) {
        // Drop ingredient in!
        this.dropIngredient(dragId, x, y);
      }
    };

    // Prevent touch from also firing mouse events
    let touchActive = false;

    // Mouse (desktop only — skipped if touch was just used)
    this.canvas.addEventListener('mousedown', (e) => { if (touchActive) return; const p = getPos(e); onDown(p.x, p.y); });
    this.canvas.addEventListener('mousemove', (e) => { if (touchActive) return; const p = getPos(e); onMove(p.x, p.y); });
    this.canvas.addEventListener('mouseup', (e) => { if (touchActive) return; const p = getPos(e); onUp(p.x, p.y); });

    // Touch (mobile)
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault(); // Prevent synthetic mouse events
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

  private dropIngredient(id: string, fromX: number, fromY: number): void {
    if (this.selectedIngredients.length >= 3) return;
    this.selectedIngredients.push(id);

    const ing = getIngredient(id)!;
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * this.potRadius * 0.4;

    this.dropped.push({
      id,
      color: ing.color,
      x: fromX,
      y: fromY,
      targetX: this.potCenterX + Math.cos(angle) * r,
      targetY: this.potCenterY + Math.sin(angle) * r * 0.4,
      landed: false,
      ripple: 0,
      size: 10,
    });

    // Sound
    playPlop();
    setTimeout(() => playBubble(0.8 + Math.random() * 0.4), 150);

    // Update liquid color
    this.updateLiquidColor();
    this.rebuildSlots();
  }

  private updateLiquidColor(): void {
    if (this.selectedIngredients.length === 0) {
      this.liquidColor = '#2d2555';
      return;
    }
    // Mix ingredient colors
    let r = 0, g = 0, b = 0;
    for (const id of this.selectedIngredients) {
      const ing = getIngredient(id);
      if (!ing) continue;
      const hex = ing.color;
      const v = parseInt(hex.slice(1), 16);
      r += (v >> 16) & 255;
      g += (v >> 8) & 255;
      b += v & 255;
    }
    const n = this.selectedIngredients.length;
    r = Math.round(r / n);
    g = Math.round(g / n);
    b = Math.round(b / n);
    this.liquidColor = `rgb(${r},${g},${b})`;
  }

  private doBrew(): void {
    this.phase = 'brewing';
    this.brewStartTime = this.time;

    // Sounds
    playSizzle(2);
    setTimeout(() => startBubbling(), 400);
    setTimeout(() => playPour(), 1200);

    // Actually brew after animation
    setTimeout(() => {
      stopBubbling();
      const result = this.engine.brew([...this.selectedIngredients]);
      if (result) {
        this.resultPotion = result.potion;
        this.phase = 'result';
        this.resultAlpha = 0;
        // Sparks
        const sparkCount = result.potion.quality === 'masterwork' ? 60 : result.potion.quality === 'superior' ? 40 : 20;
        const sparkColor = result.potion.quality === 'masterwork' ? '#fbbf24' : result.potion.quality === 'superior' ? '#60a5fa' : this.liquidColor;
        for (let i = 0; i < sparkCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1 + Math.random() * 4;
          this.sparks.push({
            x: this.potCenterX, y: this.potCenterY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            life: 50 + Math.random() * 50, maxLife: 100,
            color: sparkColor, size: 2 + Math.random() * 3,
          });
        }
        if (result.potion.quality === 'masterwork') {
          playMasterworkFanfare();
        } else {
          playSuccessChime();
        }
      } else {
        // Failed — close
        this.phase = 'idle';
        this.selectedIngredients = [];
        this.dropped = [];
        this.rebuildSlots();
      }
    }, 3000);
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
    stopBubbling();
  }

  private update(): void {
    // Dropped ingredients animate toward target
    for (const d of this.dropped) {
      if (d.landed) {
        d.ripple += 0.02;
        continue;
      }
      d.x += (d.targetX - d.x) * 0.15;
      d.y += (d.targetY - d.y) * 0.15;
      d.size *= 0.98;
      if (Math.abs(d.x - d.targetX) < 2 && Math.abs(d.y - d.targetY) < 2) {
        d.landed = true;
        d.ripple = 0.01;
      }
    }

    // Liquid bubbles
    if (this.selectedIngredients.length > 0 || this.phase === 'brewing') {
      if (Math.random() < (this.phase === 'brewing' ? 0.2 : 0.05)) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * this.potRadius * 0.7;
        this.liquidBubbles.push({
          x: this.potCenterX + Math.cos(angle) * r,
          y: this.potCenterY + Math.sin(angle) * r * 0.4,
          r: 2 + Math.random() * 4,
          life: 30 + Math.random() * 30,
        });
      }
    }
    for (let i = this.liquidBubbles.length - 1; i >= 0; i--) {
      this.liquidBubbles[i].life--;
      this.liquidBubbles[i].y -= 0.3;
      if (this.liquidBubbles[i].life <= 0) this.liquidBubbles.splice(i, 1);
    }

    // Swirls during brewing
    if (this.phase === 'brewing' && Math.random() < 0.1) {
      this.swirls.push({
        angle: Math.random() * Math.PI * 2,
        r: this.potRadius * 0.3 + Math.random() * this.potRadius * 0.4,
        color: this.liquidColor,
        size: 3 + Math.random() * 4,
        life: 60,
      });
    }
    for (let i = this.swirls.length - 1; i >= 0; i--) {
      this.swirls[i].angle += 0.04;
      this.swirls[i].life--;
      if (this.swirls[i].life <= 0) this.swirls.splice(i, 1);
    }

    // Sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.06;
      s.life--;
      if (s.life <= 0) this.sparks.splice(i, 1);
    }

    // Result fade in
    if (this.phase === 'result' && this.resultAlpha < 1) {
      this.resultAlpha = Math.min(1, this.resultAlpha + 0.02);
    }
  }

  // ── Draw ──────────────────────────────────

  private draw(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const t = this.time;
    const pr = this.potRadius;
    const cx = this.potCenterX;
    const cy = this.potCenterY;
    const isBrewing = this.phase === 'brewing';
    const hasLiquid = this.selectedIngredients.length > 0 || isBrewing;

    // ── Pure black background ──
    ctx.fillStyle = '#050308';
    ctx.fillRect(0, 0, w, h);

    // ── MASSIVE ambient glow from liquid ──
    const glowIntensity = isBrewing ? 0.5 : hasLiquid ? 0.25 : 0.08;
    const glowR = pr * 3.5 + (isBrewing ? Math.sin(t * 2) * 30 : 0);
    const liqRgb = this.getLiquidRgb();
    const glow1 = ctx.createRadialGradient(cx, cy, pr * 0.3, cx, cy, glowR);
    glow1.addColorStop(0, `rgba(${liqRgb},${glowIntensity})`);
    glow1.addColorStop(0.4, `rgba(${liqRgb},${glowIntensity * 0.4})`);
    glow1.addColorStop(1, 'transparent');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, w, h);

    // Secondary upward glow (light hitting ceiling/walls)
    const glow2 = ctx.createRadialGradient(cx, cy - pr, pr * 0.5, cx, cy - pr * 2, pr * 3);
    glow2.addColorStop(0, `rgba(${liqRgb},${glowIntensity * 0.3})`);
    glow2.addColorStop(1, 'transparent');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, w, h);

    // ── Rising sparkle particles (always, more during brewing) ──
    this.drawRisingSparkles(ctx, cx, cy, pr, t, isBrewing);

    // ── Cauldron body — 3/4 perspective ──
    const rimW = pr * 1.1;  // horizontal radius of rim ellipse
    const rimH = pr * 0.45; // vertical (perspective squash)
    const bodyDepth = pr * 0.55; // visible pot wall below rim

    // Pot body (visible front wall)
    const bodyGrad = ctx.createLinearGradient(cx - rimW, cy, cx + rimW, cy);
    bodyGrad.addColorStop(0, '#1a1520');
    bodyGrad.addColorStop(0.15, '#2a2535');
    bodyGrad.addColorStop(0.4, '#353040');
    bodyGrad.addColorStop(0.6, '#2a2535');
    bodyGrad.addColorStop(0.85, '#1a1520');
    bodyGrad.addColorStop(1, '#100e18');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy + bodyDepth * 0.5, rimW, rimH + bodyDepth, 0, 0, Math.PI);
    ctx.ellipse(cx, cy, rimW, rimH, 0, Math.PI, 0, true);
    ctx.fill();

    // Rim band — visible front arc
    ctx.strokeStyle = '#4a4258';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rimW, rimH, 0, 0.05, Math.PI - 0.05);
    ctx.stroke();
    // Rim highlight
    ctx.strokeStyle = 'rgba(180, 160, 210, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 2, rimW + 1, rimH + 1, 0, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // ── Handle arc over the top ──
    ctx.strokeStyle = '#3a3348';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.ellipse(cx, cy - pr * 0.1, rimW * 0.55, pr * 0.7, 0, Math.PI + 0.3, -0.3);
    ctx.stroke();
    // Handle highlight
    ctx.strokeStyle = 'rgba(160, 140, 200, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy - pr * 0.1, rimW * 0.55, pr * 0.7, 0, Math.PI + 0.5, -0.5);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // ── Inner darkness (pot interior) ──
    const innerW = rimW - 6;
    const innerH = rimH - 4;
    ctx.fillStyle = '#0a0810';
    ctx.beginPath();
    ctx.ellipse(cx, cy, innerW, innerH, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── GLOWING liquid surface ──
    const liqW = innerW - 3;
    const liqH = innerH - 2;

    // Liquid base — bright saturated
    const liqGrad = ctx.createRadialGradient(cx, cy - liqH * 0.15, liqW * 0.1, cx, cy, liqW);
    liqGrad.addColorStop(0, this.brightenColor(this.liquidColor, 1.4));
    liqGrad.addColorStop(0.5, this.liquidColor);
    liqGrad.addColorStop(1, this.darkenColor(this.liquidColor, 0.4));
    ctx.fillStyle = liqGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, liqW, liqH, 0, 0, Math.PI * 2);
    ctx.fill();

    // Liquid glow bloom (additive)
    ctx.globalCompositeOperation = 'lighter';
    const bloomGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, liqW);
    bloomGrad.addColorStop(0, `rgba(${liqRgb},0.4)`);
    bloomGrad.addColorStop(0.6, `rgba(${liqRgb},0.15)`);
    bloomGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = bloomGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, liqW * 1.2, liqH * 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // ── Swirls in liquid ──
    for (const sw of this.swirls) {
      const sx = cx + Math.cos(sw.angle) * Math.min(sw.r, liqW * 0.7);
      const sy = cy + Math.sin(sw.angle) * Math.min(sw.r, liqH * 0.7);
      ctx.globalAlpha = sw.life / 60 * 0.5;
      ctx.fillStyle = this.brightenColor(sw.color, 1.3);
      ctx.beginPath();
      ctx.arc(sx, sy, sw.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── Large floating orbs on liquid (like the reference) ──
    const orbCount = hasLiquid ? 3 : 0;
    for (let i = 0; i < orbCount; i++) {
      const angle = t * 0.3 + i * (Math.PI * 2 / orbCount);
      const orbR = liqW * 0.3 + Math.sin(t + i * 2) * liqW * 0.15;
      const orbX = cx + Math.cos(angle) * orbR;
      const orbY = cy + Math.sin(angle) * liqH * 0.4;
      const size = 10 + Math.sin(t * 1.5 + i) * 4;

      // Orb glow
      ctx.globalCompositeOperation = 'lighter';
      const orbGrad = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, size * 2);
      orbGrad.addColorStop(0, `rgba(${liqRgb},0.4)`);
      orbGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(orbX, orbY, size * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      // Orb body
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = this.brightenColor(this.liquidColor, 1.6);
      ctx.beginPath();
      ctx.arc(orbX, orbY, size, 0, Math.PI * 2);
      ctx.fill();
      // Orb highlight
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(orbX - size * 0.25, orbY - size * 0.25, size * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // ── Bubbles on surface ──
    for (const bub of this.liquidBubbles) {
      const alpha = Math.min(1, bub.life / 15) * 0.7;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgba(${liqRgb},0.3)`;
      ctx.beginPath();
      ctx.arc(bub.x, bub.y, bub.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,0.4)`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(bub.x - bub.r * 0.25, bub.y - bub.r * 0.3, bub.r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── Dropped ingredients flying in ──
    for (const d of this.dropped) {
      if (d.landed && d.ripple < 1) {
        ctx.globalAlpha = (1 - d.ripple) * 0.6;
        ctx.strokeStyle = d.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(d.targetX, d.targetY, d.ripple * 25, d.ripple * 10, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (!d.landed) {
        const grad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.size * 1.5);
        grad.addColorStop(0, 'white');
        grad.addColorStop(0.3, d.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Dragged ingredient ──
    if (this.dragging) {
      const ing = getIngredient(this.dragging.id);
      if (ing) {
        const dx = this.dragging.x;
        const dy = this.dragging.y;
        // Big glowing orb while dragging
        ctx.globalCompositeOperation = 'lighter';
        const dGrad = ctx.createRadialGradient(dx, dy, 0, dx, dy, 35);
        dGrad.addColorStop(0, 'rgba(255,255,255,0.5)');
        dGrad.addColorStop(0.3, ing.color);
        dGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = dGrad;
        ctx.beginPath();
        ctx.arc(dx, dy, 35, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        // Drop zone pulse
        const dist = Math.hypot(dx - cx, dy - cy);
        if (dist < pr * 1.5) {
          ctx.strokeStyle = '#4ade80';
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 6]);
          ctx.globalAlpha = 0.5 + Math.sin(t * 5) * 0.3;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rimW + 6, rimH + 4, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        }
      }
    }

    // ── Sparks (completion) ──
    for (const s of this.sparks) {
      ctx.globalAlpha = Math.min(1, s.life / (s.maxLife * 0.3));
      ctx.globalCompositeOperation = 'lighter';
      const sg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 2);
      sg.addColorStop(0, 'white');
      sg.addColorStop(0.4, s.color);
      sg.addColorStop(1, 'transparent');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;

    // ── Top rim (back arc — drawn on top to show perspective) ──
    ctx.strokeStyle = '#3a3348';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rimW, rimH, 0, Math.PI + 0.05, -0.05, true);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(200, 180, 240, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 2, rimW + 1, rimH, 0, Math.PI + 0.1, -0.1, true);
    ctx.stroke();

    // ── UI text ──
    ctx.fillStyle = '#8b83a8';
    ctx.font = '500 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    if (this.phase === 'idle') {
      ctx.fillText(`${this.selectedIngredients.length}/3 ingredients`, cx, cy + rimH + bodyDepth + 20);
    } else if (this.phase === 'brewing') {
      ctx.fillStyle = this.liquidColor;
      ctx.fillText('Brewing...', cx, cy + rimH + bodyDepth + 20);
    }

    if (this.recipePreview && this.phase === 'idle') {
      ctx.fillStyle = '#e2ddf5';
      ctx.font = '600 16px "Cinzel", serif';
      ctx.fillText(this.recipePreview, cx, cy + rimH + bodyDepth + 44);
    } else if (this.selectedIngredients.length >= 2 && !this.recipePreview && this.phase === 'idle') {
      ctx.fillStyle = '#f87171';
      ctx.font = '500 12px Inter, sans-serif';
      ctx.fillText('No recipe found', cx, cy + rimH + bodyDepth + 44);
    }

    // ── Brew Button ──
    if (this.phase === 'idle' && this.selectedIngredients.length >= 2) {
      const btnW = 180;
      const btnX = w / 2 - btnW / 2;
      const btnY = this.brewBtnY;
      ctx.globalAlpha = this.canBrew ? 1 : 0.35;
      const bGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + this.brewBtnH);
      bGrad.addColorStop(0, '#7c3aed');
      bGrad.addColorStop(1, '#a855f7');
      ctx.fillStyle = bGrad;
      this.roundRect(ctx, btnX, btnY, btnW, this.brewBtnH, 12);
      ctx.fill();
      // Button glow
      if (this.canBrew) {
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 15;
        this.roundRect(ctx, btnX, btnY, btnW, this.brewBtnH, 12);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = 'white';
      ctx.font = '600 15px Inter, sans-serif';
      ctx.fillText(this.canBrew ? 'Brew!' : 'Not enough mana', w / 2, btnY + 28);
      ctx.globalAlpha = 1;
    }

    // ── Ingredient tray ──
    this.drawIngredientTray(ctx, w, h);

    // ── Result overlay ──
    if (this.phase === 'result' && this.resultPotion) {
      this.drawResult(ctx, w, h);
    }

    // ── Close button (top-right) ──
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

    ctx.textAlign = 'start';
  }

  private drawRisingSparkles(ctx: CanvasRenderingContext2D, cx: number, cy: number, pr: number, t: number, intense: boolean): void {
    const count = intense ? 20 : 8;
    for (let i = 0; i < count; i++) {
      const seed = i * 137.5;
      const life = ((t * 0.4 + seed) % 3) / 3; // 0→1 loop
      const x = cx + Math.sin(seed) * pr * 1.2 + Math.sin(t * 0.5 + i) * 15;
      const y = cy - life * pr * 3 + Math.sin(seed * 0.3) * 20;
      const alpha = Math.sin(life * Math.PI) * (intense ? 0.5 : 0.25);
      const size = 1 + Math.abs(Math.sin(seed)) * 1.5;
      if (alpha <= 0 || size <= 0) continue;

      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = 'lighter';
      const liqRgb = this.getLiquidRgb();
      ctx.fillStyle = `rgba(${liqRgb},0.8)`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  }

  private drawIngredientTray(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    // Background tray
    const trayY = h - 120;
    ctx.fillStyle = '#161229';
    ctx.fillRect(0, trayY, w, 120);
    ctx.strokeStyle = '#2d2555';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, trayY);
    ctx.lineTo(w, trayY);
    ctx.stroke();

    // Label
    ctx.fillStyle = '#8b83a8';
    ctx.font = '500 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Drag ingredients into the cauldron', w / 2, trayY + 14);
    ctx.textAlign = 'start';

    // Ingredient cards
    for (const slot of this.slots) {
      if (slot.x + slot.w < 0 || slot.x > w) continue; // Off-screen

      ctx.fillStyle = '#1e1838';
      ctx.strokeStyle = '#2d2555';
      ctx.lineWidth = 1;
      this.roundRect(ctx, slot.x, slot.y, slot.w, slot.h, 8);
      ctx.fill();
      ctx.stroke();

      // Color dot
      ctx.fillStyle = slot.ing.color;
      ctx.beginPath();
      ctx.arc(slot.x + slot.w / 2, slot.y + 28, 12, 0, Math.PI * 2);
      ctx.fill();

      // Inner glow
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(slot.x + slot.w / 2 - 3, slot.y + 25, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Name
      ctx.fillStyle = '#e2ddf5';
      ctx.font = '500 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      const name = slot.ing.name.length > 9 ? slot.ing.name.slice(0, 8) + '.' : slot.ing.name;
      ctx.fillText(name, slot.x + slot.w / 2, slot.y + 55);

      // Count
      ctx.fillStyle = '#8b83a8';
      ctx.font = '600 11px Inter, sans-serif';
      ctx.fillText(`×${slot.count}`, slot.x + slot.w / 2, slot.y + 72);

      ctx.textAlign = 'start';
    }

    if (this.slots.length === 0) {
      ctx.fillStyle = '#5b4c8a';
      ctx.font = '500 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No ingredients — go foraging!', w / 2, trayY + 60);
      ctx.textAlign = 'start';
    }
  }

  private drawResult(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const p = this.resultPotion!;
    ctx.globalAlpha = this.resultAlpha * 0.6;
    ctx.fillStyle = '#0a0818';
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = this.resultAlpha;

    const cy = h * 0.4;

    // Potion name
    ctx.fillStyle = '#e2ddf5';
    ctx.font = '700 22px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.name, w / 2, cy - 20);

    // Quality
    const qualColors: Record<string, string> = {
      shoddy: '#888', common: '#e2ddf5', fine: '#4ade80', superior: '#60a5fa', masterwork: '#fbbf24',
    };
    ctx.fillStyle = qualColors[p.quality] || '#e2ddf5';
    ctx.font = '600 16px Inter, sans-serif';
    ctx.fillText(p.quality.charAt(0).toUpperCase() + p.quality.slice(1) + ' Quality', w / 2, cy + 10);

    // Category + price
    ctx.fillStyle = '#8b83a8';
    ctx.font = '500 13px Inter, sans-serif';
    ctx.fillText(`${p.category} · ${p.sellPrice}g`, w / 2, cy + 35);

    // Tap to continue
    ctx.globalAlpha = this.resultAlpha * (0.4 + Math.sin(this.time * 3) * 0.2);
    ctx.fillStyle = '#8b83a8';
    ctx.font = '500 12px Inter, sans-serif';
    ctx.fillText('Tap anywhere to continue', w / 2, h * 0.7);

    ctx.textAlign = 'start';
    ctx.globalAlpha = 1;
  }

  private getLiquidRgb(): string {
    const m = this.liquidColor.match(/rgb\((\d+),(\d+),(\d+)\)/);
    if (m) return `${m[1]},${m[2]},${m[3]}`;
    if (this.liquidColor.startsWith('#') && this.liquidColor.length >= 7) {
      const v = parseInt(this.liquidColor.slice(1, 7), 16);
      return `${(v >> 16) & 255},${(v >> 8) & 255},${v & 255}`;
    }
    return '168,85,247';
  }

  private brightenColor(color: string, factor: number): string {
    const m = color.match(/rgb\((\d+),(\d+),(\d+)\)/);
    if (m) {
      return `rgb(${Math.min(255, Math.round(+m[1] * factor))},${Math.min(255, Math.round(+m[2] * factor))},${Math.min(255, Math.round(+m[3] * factor))})`;
    }
    if (color.startsWith('#') && color.length >= 7) {
      const v = parseInt(color.slice(1, 7), 16);
      const r = Math.min(255, Math.round(((v >> 16) & 255) * factor));
      const g = Math.min(255, Math.round(((v >> 8) & 255) * factor));
      const b = Math.min(255, Math.round((v & 255) * factor));
      return `rgb(${r},${g},${b})`;
    }
    return color;
  }

  private darkenColor(color: string, factor: number): string {
    // Handle rgb() format
    const m = color.match(/rgb\((\d+),(\d+),(\d+)\)/);
    if (m) {
      return `rgb(${Math.round(+m[1] * factor)},${Math.round(+m[2] * factor)},${Math.round(+m[3] * factor)})`;
    }
    // Handle hex
    if (color.startsWith('#') && color.length >= 7) {
      const v = parseInt(color.slice(1, 7), 16);
      const r = Math.round(((v >> 16) & 255) * factor);
      const g = Math.round(((v >> 8) & 255) * factor);
      const b = Math.round((v & 255) * factor);
      return `rgb(${r},${g},${b})`;
    }
    return color;
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
