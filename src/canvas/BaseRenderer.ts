// ── Types ───────────────────────────────────────────────

export interface Hotspot {
  id: string;
  label: string;
  x: number; y: number;
  w: number; h: number;
  hovered: boolean;
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

export interface CandleLight {
  x: number; y: number;
  baseRadius: number;
  color: string;
  flicker: number; // phase offset
}

interface BubbleParticle {
  x: number; y: number;
  r: number;
  speed: number;
  alpha: number;
}

interface BrewAnimation {
  startTime: number;
  duration: number; // total seconds
  phase: 'drop' | 'mix' | 'boil' | 'burst' | 'done';
  ingredientColors: string[];
  resultColor: string;
  quality: string;
  // Floating ingredient particles
  drops: { x: number; y: number; targetY: number; color: string; landed: boolean; size: number }[];
  // Sparkles on completion
  sparks: { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }[];
  // Ripples when ingredients land
  ripples: { x: number; y: number; r: number; alpha: number }[];
  // Swirl particles in liquid
  swirls: { angle: number; r: number; color: string; size: number }[];
}

// ── Color helpers ───────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

// ── Base Renderer ───────────────────────────────────────

export class BaseRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private animFrame = 0;
  private time = 0;
  private running = false;
  private isPortrait = false;

  // Scene
  private tier: string = 'attic';
  private hotspots: Hotspot[] = [];
  private candles: CandleLight[] = [];
  private dustParticles: Particle[] = [];
  private bubbles: BubbleParticle[] = [];
  private steamParticles: Particle[] = [];

  // Interaction
  private mouseX = -1;
  private mouseY = -1;
  private hoveredHotspot: string | null = null;
  private touchStartPos: { x: number; y: number } | null = null;
  private lastInteractionTime = 0;
  onHotspotClick: ((id: string) => void) | null = null;
  onHotspotHover: ((id: string | null) => void) | null = null;

  // Shelves visual state
  potionCount = 0;
  ingredientCount = 0;
  isBrewing = false;

  // Brewing animation state
  private brewAnim: BrewAnimation | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    this.setupEvents();
    this.start();
  }

  setTier(tier: string): void {
    this.tier = tier;
    this.buildScene();
  }

  private resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.isPortrait = this.height > this.width * 1.1;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.buildScene();
  }

  private setupEvents(): void {
    const onResize = () => this.resize();
    window.addEventListener('resize', onResize);

    const getPos = (e: MouseEvent | Touch) => {
      const rect = this.canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    this.canvas.addEventListener('mousemove', (e) => {
      const p = getPos(e);
      this.mouseX = p.x;
      this.mouseY = p.y;
      this.lastInteractionTime = this.time;
      this.updateHover();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouseX = -1;
      this.mouseY = -1;
      this.updateHover();
    });

    // Track whether touch handled the tap so click doesn't double-fire
    let touchHandled = false;

    this.canvas.addEventListener('click', (e) => {
      if (touchHandled) {
        touchHandled = false;
        return; // Already handled by touchend
      }
      const p = getPos(e);
      this.mouseX = p.x;
      this.mouseY = p.y;
      this.lastInteractionTime = this.time;
      this.updateHover();
      if (this.hoveredHotspot && this.onHotspotClick) {
        this.onHotspotClick(this.hoveredHotspot);
      }
    });

    // Touch: record start, fire on touchend if didn't drag
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        this.touchStartPos = getPos(e.touches[0]);
        this.lastInteractionTime = this.time;
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', (e) => {
      if (!this.touchStartPos || e.changedTouches.length === 0) return;
      const p = getPos(e.changedTouches[0]);
      const dx = Math.abs(p.x - this.touchStartPos.x);
      const dy = Math.abs(p.y - this.touchStartPos.y);
      this.touchStartPos = null;
      if (dx > 20 || dy > 20) return; // Was a drag, ignore

      this.mouseX = p.x;
      this.mouseY = p.y;
      this.lastInteractionTime = this.time;
      this.updateHover();
      if (this.hoveredHotspot && this.onHotspotClick) {
        touchHandled = true; // Suppress the upcoming synthetic click
        this.onHotspotClick(this.hoveredHotspot);
      }
    }, { passive: true });
  }

  private updateHover(): void {
    let found: string | null = null;
    // Expand hit area by padding on touch devices
    const pad = ('ontouchstart' in window) ? 10 : 0;
    for (const hs of this.hotspots) {
      hs.hovered = this.mouseX >= hs.x - pad && this.mouseX <= hs.x + hs.w + pad &&
                    this.mouseY >= hs.y - pad && this.mouseY <= hs.y + hs.h + pad;
      if (hs.hovered) found = hs.id;
    }
    if (found !== this.hoveredHotspot) {
      this.hoveredHotspot = found;
      this.canvas.style.cursor = found ? 'pointer' : 'default';
      this.onHotspotHover?.(found);
    }
  }

  // ── Scene Building ────────────────────────────────────

  private buildScene(): void {
    const w = this.width;
    const h = this.height;
    this.hotspots = [];
    this.candles = [];
    this.dustParticles = [];
    this.bubbles = [];
    this.steamParticles = [];

    // All tiers share the same hotspot concept, just positioned differently
    switch (this.tier) {
      case 'cottage':
        this.buildCottage(w, h);
        break;
      case 'tower':
        this.buildTower(w, h);
        break;
      case 'manor':
        this.buildManor(w, h);
        break;
      case 'castle':
        this.buildCastle(w, h);
        break;
      default:
        this.buildAttic(w, h);
        break;
    }

    // Enforce minimum 48px tap targets
    for (const hs of this.hotspots) {
      const minSize = 48;
      if (hs.w < minSize) { hs.x -= (minSize - hs.w) / 2; hs.w = minSize; }
      if (hs.h < minSize) { hs.y -= (minSize - hs.h) / 2; hs.h = minSize; }
    }

    // Seed dust particles
    for (let i = 0; i < 25; i++) {
      this.dustParticles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.1 - Math.random() * 0.2,
        life: Math.random() * 200,
        maxLife: 200 + Math.random() * 200,
        size: 1 + Math.random() * 2,
        color: '#fde68a',
        alpha: 0.1 + Math.random() * 0.2,
      });
    }
  }

  private buildAttic(w: number, h: number): void {
    // In portrait: use top portion as room, raise floor
    const floorY = this.isPortrait ? h * 0.50 : h * 0.72;
    const cx = w * 0.5;

    this.candles.push(
      { x: w * 0.15, y: floorY - 50, baseRadius: 60, color: '#fbbf24', flicker: 0 },
      { x: w * 0.78, y: floorY - 80, baseRadius: 50, color: '#fb923c', flicker: 1.5 },
      { x: cx, y: floorY - 90, baseRadius: 40, color: '#fde68a', flicker: 3 },
    );

    if (this.isPortrait) {
      // Portrait layout: stack objects more vertically, bigger hotspots
      this.hotspots.push(
        { id: 'window', label: 'World Map', x: cx - 45, y: h * 0.05, w: 90, h: 70, hovered: false },
        { id: 'cauldron', label: 'Brew Potions', x: cx - 50, y: floorY - 90, w: 100, h: 90, hovered: false },
        { id: 'shelves', label: 'Inventory', x: w * 0.68, y: floorY - 130, w: 80, h: 100, hovered: false },
        { id: 'workbench', label: 'Upgrades', x: w * 0.05, y: floorY - 70, w: 80, h: 70, hovered: false },
        { id: 'ingredients', label: 'Foraging', x: w * 0.15, y: floorY + 10, w: w * 0.3, h: 60, hovered: false },
        { id: 'door', label: 'Distributors', x: w * 0.82, y: floorY - 110, w: 55, h: 110, hovered: false },
      );
    } else {
      this.hotspots.push(
        { id: 'cauldron', label: 'Brew Potions', x: cx - 50, y: floorY - 100, w: 100, h: 100, hovered: false },
        { id: 'shelves', label: 'Inventory', x: w * 0.72, y: floorY - 160, w: 80, h: 120, hovered: false },
        { id: 'window', label: 'World Map', x: w * 0.38, y: h * 0.12, w: 90, h: 80, hovered: false },
        { id: 'workbench', label: 'Upgrades', x: w * 0.08, y: floorY - 80, w: 80, h: 80, hovered: false },
        { id: 'door', label: 'Distributors', x: w * 0.88, y: floorY - 130, w: 55, h: 130, hovered: false },
        { id: 'ingredients', label: 'Foraging', x: w * 0.22, y: floorY - 55, w: 60, h: 55, hovered: false },
      );
    }
  }

  private buildCottage(w: number, h: number): void {
    const floorY = this.isPortrait ? h * 0.48 : h * 0.70;
    const cx = w * 0.5;

    this.candles.push(
      { x: w * 0.2, y: floorY - 60, baseRadius: 70, color: '#fbbf24', flicker: 0 },
      { x: w * 0.5, y: floorY - 100, baseRadius: 55, color: '#fb923c', flicker: 2 },
      { x: w * 0.8, y: floorY - 70, baseRadius: 65, color: '#fde68a', flicker: 1 },
      { x: w * 0.35, y: floorY * 0.3, baseRadius: 80, color: '#fef3c7', flicker: 0.5 },
    );

    this.hotspots.push(
      { id: 'cauldron', label: 'Brew Potions', x: cx - 55, y: floorY - 100, w: 110, h: 100, hovered: false },
      { id: 'shelves', label: 'Inventory', x: w * 0.7, y: floorY - 140, w: 90, h: 110, hovered: false },
      { id: 'window', label: 'World Map', x: w * 0.3, y: floorY * 0.08, w: 110, h: 80, hovered: false },
      { id: 'workbench', label: 'Upgrades', x: w * 0.05, y: floorY - 80, w: 90, h: 80, hovered: false },
      { id: 'door', label: 'Distributors', x: w * 0.87, y: floorY - 130, w: 55, h: 130, hovered: false },
      { id: 'ingredients', label: 'Foraging', x: w * 0.18, y: floorY - 50, w: 70, h: 50, hovered: false },
    );
  }

  private buildTower(w: number, h: number): void {
    this.buildCottage(w, h);
  }

  private buildManor(w: number, h: number): void {
    const floorY = this.isPortrait ? h * 0.46 : h * 0.68;
    const cx = w * 0.5;

    this.candles.push(
      { x: w * 0.15, y: floorY - 80, baseRadius: 80, color: '#a78bfa', flicker: 0 },
      { x: w * 0.5, y: floorY - 120, baseRadius: 70, color: '#fbbf24', flicker: 1.5 },
      { x: w * 0.85, y: floorY - 80, baseRadius: 80, color: '#a78bfa', flicker: 3 },
      { x: w * 0.3, y: floorY * 0.2, baseRadius: 90, color: '#fef3c7', flicker: 0.5 },
      { x: w * 0.7, y: floorY * 0.2, baseRadius: 90, color: '#fef3c7', flicker: 2.5 },
    );

    this.hotspots.push(
      { id: 'cauldron', label: 'Brew Potions', x: cx - 60, y: floorY - 110, w: 120, h: 110, hovered: false },
      { id: 'shelves', label: 'Inventory', x: w * 0.7, y: floorY - 160, w: 100, h: 130, hovered: false },
      { id: 'window', label: 'World Map', x: w * 0.25, y: floorY * 0.05, w: 120, h: 90, hovered: false },
      { id: 'window2', label: 'World Map', x: w * 0.6, y: floorY * 0.05, w: 120, h: 90, hovered: false },
      { id: 'workbench', label: 'Upgrades', x: w * 0.03, y: floorY - 90, w: 100, h: 90, hovered: false },
      { id: 'door', label: 'Distributors', x: w * 0.87, y: floorY - 140, w: 60, h: 140, hovered: false },
      { id: 'ingredients', label: 'Foraging', x: w * 0.15, y: floorY - 55, w: 80, h: 55, hovered: false },
    );
  }

  private buildCastle(w: number, h: number): void {
    this.buildManor(w, h);
  }

  // ── Main Draw Loop ────────────────────────────────────

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

  // ── Brew Animation API ─────────────────────

  startBrewAnimation(ingredientColors: string[], resultColor: string, quality: string): void {
    const w = this.width;
    const floorY = this.getFloorY();
    const cx = w * 0.5;

    const drops = ingredientColors.map((color, i) => ({
      x: cx - 30 + i * 30,
      y: -20 - i * 40,
      targetY: floorY - 60,
      color,
      landed: false,
      size: 8 + Math.random() * 4,
    }));

    this.brewAnim = {
      startTime: this.time,
      duration: 4.5,
      phase: 'drop',
      ingredientColors,
      resultColor,
      quality,
      drops,
      sparks: [],
      ripples: [],
      swirls: [],
    };
    this.isBrewing = true;
  }

  private updateBrewAnimation(): void {
    const anim = this.brewAnim;
    if (!anim) return;

    const elapsed = this.time - anim.startTime;
    const w = this.width;
    const floorY = this.getFloorY();
    const cx = w * 0.5;

    // Phase transitions
    if (elapsed < 1.5) {
      anim.phase = 'drop';
    } else if (elapsed < 2.8) {
      anim.phase = 'mix';
    } else if (elapsed < 3.8) {
      anim.phase = 'boil';
    } else if (elapsed < 4.5) {
      anim.phase = 'burst';
    } else {
      anim.phase = 'done';
      this.brewAnim = null;
      this.isBrewing = false;
      return;
    }

    // Drop phase: ingredients fall into cauldron
    if (anim.phase === 'drop') {
      for (const drop of anim.drops) {
        if (!drop.landed) {
          drop.y += 3.5;
          if (drop.y >= drop.targetY) {
            drop.y = drop.targetY;
            drop.landed = true;
            // Add ripple
            anim.ripples.push({ x: drop.x, y: floorY - 58, r: 2, alpha: 0.8 });
          }
        }
      }
    }

    // Mix phase: swirl particles appear
    if (anim.phase === 'mix') {
      if (Math.random() < 0.15) {
        const color = anim.ingredientColors[Math.floor(Math.random() * anim.ingredientColors.length)];
        anim.swirls.push({
          angle: Math.random() * Math.PI * 2,
          r: 5 + Math.random() * 20,
          color,
          size: 2 + Math.random() * 3,
        });
      }
    }

    // Boil phase: more swirls, change to result color
    if (anim.phase === 'boil') {
      if (Math.random() < 0.2) {
        anim.swirls.push({
          angle: Math.random() * Math.PI * 2,
          r: 5 + Math.random() * 25,
          color: anim.resultColor,
          size: 2 + Math.random() * 4,
        });
      }
    }

    // Burst phase: sparkle explosion
    if (anim.phase === 'burst' && anim.sparks.length === 0) {
      const sparkCount = anim.quality === 'masterwork' ? 50 : anim.quality === 'superior' ? 35 : 20;
      const sparkColor = anim.quality === 'masterwork' ? '#fbbf24' : anim.quality === 'superior' ? '#60a5fa' : anim.resultColor;
      for (let i = 0; i < sparkCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 4;
        anim.sparks.push({
          x: cx,
          y: floorY - 70,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          life: 40 + Math.random() * 40,
          color: sparkColor,
          size: 1.5 + Math.random() * 3,
        });
      }
    }

    // Update ripples
    for (let i = anim.ripples.length - 1; i >= 0; i--) {
      const rip = anim.ripples[i];
      rip.r += 0.8;
      rip.alpha -= 0.02;
      if (rip.alpha <= 0) anim.ripples.splice(i, 1);
    }

    // Update swirls (rotate)
    for (let i = anim.swirls.length - 1; i >= 0; i--) {
      anim.swirls[i].angle += 0.05;
      anim.swirls[i].r *= 0.995;
      if (anim.swirls[i].r < 1) anim.swirls.splice(i, 1);
    }

    // Update sparks
    for (let i = anim.sparks.length - 1; i >= 0; i--) {
      const s = anim.sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.08; // gravity
      s.life--;
      if (s.life <= 0) anim.sparks.splice(i, 1);
    }
  }

  private drawBrewAnimation(ctx: CanvasRenderingContext2D): void {
    const anim = this.brewAnim;
    if (!anim) return;

    const floorY = this.getFloorY();
    const cx = this.width * 0.5;

    // Draw falling ingredient orbs
    if (anim.phase === 'drop') {
      for (const drop of anim.drops) {
        if (drop.landed) continue;
        // Glowing orb
        ctx.globalAlpha = 0.9;
        const grad = ctx.createRadialGradient(drop.x, drop.y, 0, drop.x, drop.y, drop.size);
        grad.addColorStop(0, 'white');
        grad.addColorStop(0.4, drop.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, drop.size, 0, Math.PI * 2);
        ctx.fill();
        // Trail
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = drop.color;
        ctx.beginPath();
        ctx.arc(drop.x, drop.y - 12, drop.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(drop.x, drop.y - 22, drop.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Ripples
    for (const rip of anim.ripples) {
      ctx.globalAlpha = rip.alpha;
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1.5;
      // Elliptical ripple on liquid surface
      ctx.beginPath();
      ctx.ellipse(rip.x, rip.y, rip.r, rip.r * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Swirling particles in the liquid
    for (const sw of anim.swirls) {
      const sx = cx + Math.cos(sw.angle) * sw.r;
      const sy = floorY - 58 + Math.sin(sw.angle) * sw.r * 0.25;
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = sw.color;
      ctx.beginPath();
      ctx.arc(sx, sy, sw.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Sparks
    for (const s of anim.sparks) {
      const alpha = Math.min(1, s.life / 20);
      ctx.globalAlpha = alpha;
      const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size);
      grad.addColorStop(0, 'white');
      grad.addColorStop(0.5, s.color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Screen flash on burst
    if (anim.phase === 'burst') {
      const burstT = this.time - anim.startTime - 3.8;
      if (burstT < 0.2) {
        ctx.globalAlpha = 0.15 * (1 - burstT / 0.2);
        ctx.fillStyle = anim.quality === 'masterwork' ? '#fbbf24' : 'white';
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.globalAlpha = 1;
      }
    }
  }

  private update(): void {
    const w = this.width;
    const h = this.height;

    // Update brew animation
    this.updateBrewAnimation();

    // Update dust
    for (const p of this.dustParticles) {
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      if (p.life > p.maxLife || p.y < 0 || p.x < 0 || p.x > w) {
        p.x = Math.random() * w;
        p.y = h * 0.5 + Math.random() * h * 0.4;
        p.life = 0;
      }
    }

    // Update bubbles
    if (this.isBrewing) {
      if (this.bubbles.length < 8 && Math.random() < 0.05) {
        const cx = w * 0.5;
        const floorY = this.getFloorY();
        this.bubbles.push({
          x: cx - 20 + Math.random() * 40,
          y: floorY - 30,
          r: 2 + Math.random() * 4,
          speed: 0.3 + Math.random() * 0.5,
          alpha: 0.5 + Math.random() * 0.3,
        });
      }
    }
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.y -= b.speed;
      b.x += Math.sin(this.time * 3 + i) * 0.3;
      b.alpha -= 0.003;
      if (b.alpha <= 0) this.bubbles.splice(i, 1);
    }

    // Update steam
    if (this.isBrewing && Math.random() < 0.08) {
      const cx = w * 0.5;
      const floorY = this.getFloorY();
      this.steamParticles.push({
        x: cx - 15 + Math.random() * 30,
        y: floorY - 90,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.5 - Math.random() * 0.5,
        life: 0,
        maxLife: 80 + Math.random() * 60,
        size: 6 + Math.random() * 8,
        color: '#a78bfa',
        alpha: 0.3,
      });
    }
    for (let i = this.steamParticles.length - 1; i >= 0; i--) {
      const p = this.steamParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      p.size += 0.05;
      p.alpha = 0.3 * (1 - p.life / p.maxLife);
      if (p.life > p.maxLife) this.steamParticles.splice(i, 1);
    }
  }

  private getFloorY(): number {
    if (this.isPortrait) {
      if (this.tier === 'manor' || this.tier === 'castle') return this.height * 0.46;
      if (this.tier === 'cottage' || this.tier === 'tower') return this.height * 0.48;
      return this.height * 0.50;
    }
    if (this.tier === 'manor' || this.tier === 'castle') return this.height * 0.68;
    if (this.tier === 'cottage' || this.tier === 'tower') return this.height * 0.70;
    return this.height * 0.72;
  }

  private draw(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const t = this.time;

    ctx.clearRect(0, 0, w, h);

    // Draw room based on tier
    switch (this.tier) {
      case 'cottage': this.drawCottage(ctx, w, h, t); break;
      case 'tower': this.drawTower(ctx, w, h, t); break;
      case 'manor': this.drawManor(ctx, w, h, t); break;
      case 'castle': this.drawCastle(ctx, w, h, t); break;
      default: this.drawAttic(ctx, w, h, t); break;
    }

    // Draw particles
    this.drawDust(ctx);
    this.drawBubbles(ctx);
    this.drawSteam(ctx);

    // Draw brew animation (on top of room, under hotspots)
    this.drawBrewAnimation(ctx);

    // Draw hotspot highlights
    this.drawHotspots(ctx);

    // Draw tooltip
    this.drawTooltip(ctx);
  }

  // ── Room Drawings ─────────────────────────────────────

  private drawAttic(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    const floorY = this.getFloorY();

    // Background — dark wood walls
    ctx.fillStyle = '#1a1008';
    ctx.fillRect(0, 0, w, h);

    // Sloped ceiling (attic)
    ctx.fillStyle = '#2a1a0e';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.35);
    ctx.lineTo(w * 0.5, h * 0.02);
    ctx.lineTo(w, h * 0.35);
    ctx.lineTo(w, 0);
    ctx.lineTo(0, 0);
    ctx.fill();

    // Ceiling beams
    ctx.strokeStyle = '#3d2815';
    ctx.lineWidth = 6;
    for (let i = 0; i < 5; i++) {
      const bx = w * (0.1 + i * 0.2);
      const topY = h * 0.02 + Math.abs(bx - w * 0.5) * 0.66;
      ctx.beginPath();
      ctx.moveTo(bx, topY);
      ctx.lineTo(bx, topY + 15);
      ctx.stroke();
    }

    // Roof underside
    ctx.fillStyle = '#2d1a0f';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.35);
    ctx.lineTo(w * 0.5, h * 0.02);
    ctx.lineTo(w, h * 0.35);
    ctx.closePath();
    ctx.fill();

    // Walls
    const wallGrad = ctx.createLinearGradient(0, h * 0.35, 0, floorY);
    wallGrad.addColorStop(0, '#1f140b');
    wallGrad.addColorStop(1, '#2a1c10');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, h * 0.35, w, floorY - h * 0.35);

    // Wall planks
    ctx.strokeStyle = '#1a0e06';
    ctx.lineWidth = 1;
    for (let py = h * 0.38; py < floorY; py += 30) {
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
      ctx.stroke();
    }

    // Floor
    const floorGrad = ctx.createLinearGradient(0, floorY, 0, h);
    floorGrad.addColorStop(0, '#3d2815');
    floorGrad.addColorStop(1, '#2a1a0e');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorY, w, h - floorY);

    // Floor planks
    ctx.strokeStyle = '#2a1a0e';
    ctx.lineWidth = 1;
    for (let px = 0; px < w; px += 50) {
      ctx.beginPath();
      ctx.moveTo(px, floorY);
      ctx.lineTo(px, h);
      ctx.stroke();
    }

    // ── Window ──
    const winX = w * 0.38, winY = h * 0.12, winW = 90, winH = 80;
    ctx.fillStyle = '#0a1628';
    ctx.fillRect(winX, winY, winW, winH);
    // Night sky gradient
    const skyGrad = ctx.createLinearGradient(winX, winY, winX, winY + winH);
    skyGrad.addColorStop(0, '#0f1b3d');
    skyGrad.addColorStop(1, '#162044');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(winX + 3, winY + 3, winW - 6, winH - 6);
    // Stars
    ctx.fillStyle = '#fde68a';
    for (let i = 0; i < 5; i++) {
      const sx = winX + 8 + Math.sin(i * 2.3) * 30 + 30;
      const sy = winY + 10 + Math.cos(i * 1.7) * 25 + 25;
      ctx.globalAlpha = 0.3 + Math.sin(t * 2 + i) * 0.2;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Moon
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(winX + winW * 0.7, winY + 20, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Window frame
    ctx.strokeStyle = '#4a3520';
    ctx.lineWidth = 4;
    ctx.strokeRect(winX, winY, winW, winH);
    ctx.beginPath();
    ctx.moveTo(winX + winW / 2, winY);
    ctx.lineTo(winX + winW / 2, winY + winH);
    ctx.moveTo(winX, winY + winH / 2);
    ctx.lineTo(winX + winW, winY + winH / 2);
    ctx.stroke();
    // Light spill from window
    ctx.fillStyle = 'rgba(200, 210, 255, 0.03)';
    ctx.beginPath();
    ctx.moveTo(winX, winY + winH);
    ctx.lineTo(winX - 40, floorY);
    ctx.lineTo(winX + winW + 40, floorY);
    ctx.lineTo(winX + winW, winY + winH);
    ctx.fill();

    // ── Cauldron ──
    this.drawCauldron(ctx, w * 0.5, floorY, 45, t);

    // ── Shelves ──
    this.drawShelves(ctx, w * 0.72, floorY - 160, 80, 120, t);

    // ── Workbench ──
    this.drawWorkbench(ctx, w * 0.08, floorY - 20, 80, 20);

    // ── Ingredient jars ──
    this.drawIngredientJars(ctx, w * 0.22, floorY - 5, t);

    // ── Door ──
    this.drawDoor(ctx, w * 0.88, floorY - 130, 50, 130);

    // ── Candle on workbench ──
    this.drawCandle(ctx, w * 0.15, floorY - 45, t, 0);

    // ── Candle on shelf ──
    this.drawCandle(ctx, w * 0.78, floorY - 165, t, 1.5);

    // ── Lighting pass ──
    this.drawLighting(ctx, w, h, t);
  }

  private drawCottage(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    const floorY = this.getFloorY();

    // Stone walls
    ctx.fillStyle = '#1c1510';
    ctx.fillRect(0, 0, w, h);

    // Wall
    const wallGrad = ctx.createLinearGradient(0, 0, 0, floorY);
    wallGrad.addColorStop(0, '#2a2018');
    wallGrad.addColorStop(1, '#3a2c1e');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, w, floorY);

    // Stone texture on walls
    ctx.strokeStyle = '#1a1208';
    ctx.lineWidth = 1;
    for (let row = 0; row < floorY; row += 25) {
      const offset = (Math.floor(row / 25) % 2) * 30;
      for (let col = offset; col < w; col += 60) {
        ctx.strokeRect(col, row, 58, 23);
      }
    }

    // Wooden floor
    const floorGrad = ctx.createLinearGradient(0, floorY, 0, h);
    floorGrad.addColorStop(0, '#4a3520');
    floorGrad.addColorStop(1, '#3a2815');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorY, w, h - floorY);
    ctx.strokeStyle = '#3a2815';
    for (let px = 0; px < w; px += 45) {
      ctx.beginPath(); ctx.moveTo(px, floorY); ctx.lineTo(px, h); ctx.stroke();
    }

    // Bigger window
    const winX = w * 0.3, winY = h * 0.08, winW = 110, winH = 90;
    ctx.fillStyle = '#0a1628';
    ctx.fillRect(winX, winY, winW, winH);
    const skyGrad = ctx.createLinearGradient(winX, winY, winX, winY + winH);
    skyGrad.addColorStop(0, '#162044');
    skyGrad.addColorStop(0.6, '#1a3050');
    skyGrad.addColorStop(1, '#1a4030');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(winX + 3, winY + 3, winW - 6, winH - 6);
    ctx.strokeStyle = '#5c4030';
    ctx.lineWidth = 5;
    ctx.strokeRect(winX, winY, winW, winH);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(winX + winW / 2, winY); ctx.lineTo(winX + winW / 2, winY + winH);
    ctx.moveTo(winX, winY + winH / 2); ctx.lineTo(winX + winW, winY + winH / 2);
    ctx.stroke();

    // Rug
    ctx.fillStyle = '#5c1a1a';
    this.roundRect(ctx, w * 0.3, floorY + 15, w * 0.4, h * 0.15, 4);
    ctx.fill();
    ctx.strokeStyle = '#8b3a20';
    ctx.lineWidth = 2;
    this.roundRect(ctx, w * 0.33, floorY + 20, w * 0.34, h * 0.11, 3);
    ctx.stroke();

    // Objects
    this.drawCauldron(ctx, w * 0.5, floorY, 50, t);
    this.drawShelves(ctx, w * 0.7, floorY - 170, 90, 130, t);
    this.drawWorkbench(ctx, w * 0.05, floorY - 25, 90, 25);
    this.drawIngredientJars(ctx, w * 0.18, floorY - 10, t);
    this.drawDoor(ctx, w * 0.87, floorY - 150, 55, 150);
    this.drawCandle(ctx, w * 0.2, floorY - 50, t, 0);
    this.drawCandle(ctx, w * 0.8, floorY - 175, t, 2);
    this.drawCandle(ctx, w * 0.5, floorY + 10, t, 4); // on rug edge

    this.drawLighting(ctx, w, h, t);
  }

  private drawTower(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    const floorY = this.getFloorY();

    // Curved stone walls
    ctx.fillStyle = '#1a1530';
    ctx.fillRect(0, 0, w, h);

    const wallGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.6);
    wallGrad.addColorStop(0, '#2d2555');
    wallGrad.addColorStop(1, '#1a1530');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, w, floorY);

    // Stone blocks
    ctx.strokeStyle = '#15102a';
    ctx.lineWidth = 1;
    for (let row = 0; row < floorY; row += 22) {
      const offset = (Math.floor(row / 22) % 2) * 25;
      for (let col = offset; col < w; col += 50) {
        ctx.strokeRect(col, row, 48, 20);
      }
    }

    // Stone floor
    ctx.fillStyle = '#1e1838';
    ctx.fillRect(0, floorY, w, h - floorY);

    // Arched window
    const winX = w * 0.3, winY = h * 0.08, winW = 110, winH = 100;
    ctx.fillStyle = '#0a0e28';
    ctx.beginPath();
    ctx.moveTo(winX, winY + winH);
    ctx.lineTo(winX, winY + 30);
    ctx.quadraticCurveTo(winX + winW / 2, winY - 10, winX + winW, winY + 30);
    ctx.lineTo(winX + winW, winY + winH);
    ctx.fill();
    ctx.strokeStyle = '#4a3d6a';
    ctx.lineWidth = 5;
    ctx.stroke();

    // Glowing runes on wall
    ctx.globalAlpha = 0.15 + Math.sin(t * 1.5) * 0.08;
    ctx.fillStyle = '#7c3aed';
    for (let i = 0; i < 3; i++) {
      const rx = w * 0.6 + i * 30;
      const ry = h * 0.35 + Math.sin(i * 1.2) * 15;
      ctx.beginPath(); ctx.arc(rx, ry, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    this.drawCauldron(ctx, w * 0.5, floorY, 52, t);
    this.drawShelves(ctx, w * 0.7, floorY - 170, 90, 130, t);
    this.drawWorkbench(ctx, w * 0.05, floorY - 25, 90, 25);
    this.drawIngredientJars(ctx, w * 0.18, floorY - 10, t);
    this.drawDoor(ctx, w * 0.87, floorY - 150, 55, 150);
    this.drawCandle(ctx, w * 0.2, floorY - 50, t, 0);
    this.drawCandle(ctx, w * 0.8, floorY - 175, t, 2);

    this.drawLighting(ctx, w, h, t);
  }

  private drawManor(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    const floorY = this.getFloorY();

    ctx.fillStyle = '#12102a';
    ctx.fillRect(0, 0, w, h);

    // Grand walls with wainscoting
    ctx.fillStyle = '#1e1838';
    ctx.fillRect(0, 0, w, floorY);
    ctx.fillStyle = '#251f42';
    ctx.fillRect(0, floorY * 0.55, w, floorY * 0.45);
    ctx.strokeStyle = '#3d3060';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, floorY * 0.55); ctx.lineTo(w, floorY * 0.55); ctx.stroke();

    // Marble floor
    const mGrad = ctx.createLinearGradient(0, floorY, 0, h);
    mGrad.addColorStop(0, '#2d2555');
    mGrad.addColorStop(1, '#1e1838');
    ctx.fillStyle = mGrad;
    ctx.fillRect(0, floorY, w, h - floorY);
    // Tile pattern
    ctx.strokeStyle = '#3d3060';
    ctx.lineWidth = 0.5;
    for (let px = 0; px < w; px += 40) {
      for (let py = floorY; py < h; py += 40) {
        ctx.strokeRect(px, py, 40, 40);
      }
    }

    // Two tall windows
    for (const wx of [w * 0.25, w * 0.6]) {
      ctx.fillStyle = '#0a0e28';
      ctx.beginPath();
      ctx.moveTo(wx, floorY * 0.5);
      ctx.lineTo(wx, floorY * 0.1 + 30);
      ctx.quadraticCurveTo(wx + 60, floorY * 0.1 - 10, wx + 120, floorY * 0.1 + 30);
      ctx.lineTo(wx + 120, floorY * 0.5);
      ctx.fill();
      ctx.strokeStyle = '#4a3d6a';
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    // Chandelier
    ctx.strokeStyle = '#4a3d6a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w * 0.5, 0); ctx.lineTo(w * 0.5, 30); ctx.stroke();
    for (const dx of [-30, 0, 30]) {
      this.drawCandle(ctx, w * 0.5 + dx, 35, t, dx);
    }

    // Grand rug
    ctx.fillStyle = '#3d1040';
    this.roundRect(ctx, w * 0.2, floorY + 10, w * 0.6, h * 0.2, 5);
    ctx.fill();
    ctx.strokeStyle = '#6b2060';
    ctx.lineWidth = 2;
    this.roundRect(ctx, w * 0.23, floorY + 15, w * 0.54, h * 0.16, 4);
    ctx.stroke();

    this.drawCauldron(ctx, w * 0.5, floorY, 55, t);
    this.drawShelves(ctx, w * 0.7, floorY - 180, 100, 140, t);
    this.drawWorkbench(ctx, w * 0.03, floorY - 30, 100, 30);
    this.drawIngredientJars(ctx, w * 0.15, floorY - 15, t);
    this.drawDoor(ctx, w * 0.87, floorY - 160, 60, 160);

    this.drawLighting(ctx, w, h, t);
  }

  private drawCastle(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    const floorY = this.getFloorY();

    ctx.fillStyle = '#0a0818';
    ctx.fillRect(0, 0, w, h);

    // Grand stone walls
    ctx.fillStyle = '#161230';
    ctx.fillRect(0, 0, w, floorY);

    // Massive stone blocks
    ctx.strokeStyle = '#0d0a20';
    ctx.lineWidth = 1;
    for (let row = 0; row < floorY; row += 28) {
      const offset = (Math.floor(row / 28) % 2) * 35;
      for (let col = offset; col < w; col += 70) {
        ctx.strokeRect(col, row, 68, 26);
      }
    }

    // Banner tapestries
    for (const bx of [w * 0.12, w * 0.88]) {
      ctx.fillStyle = '#4c1d95';
      ctx.fillRect(bx - 15, h * 0.05, 30, h * 0.35);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.arc(bx, h * 0.18, 8, 0, Math.PI * 2); ctx.fill();
      // Banner bottom triangle
      ctx.fillStyle = '#4c1d95';
      ctx.beginPath();
      ctx.moveTo(bx - 15, h * 0.4);
      ctx.lineTo(bx, h * 0.48);
      ctx.lineTo(bx + 15, h * 0.4);
      ctx.fill();
    }

    // Polished stone floor
    const fGrad = ctx.createLinearGradient(0, floorY, 0, h);
    fGrad.addColorStop(0, '#1e1848');
    fGrad.addColorStop(1, '#12102a');
    ctx.fillStyle = fGrad;
    ctx.fillRect(0, floorY, w, h - floorY);

    // Three arched windows
    for (const wx of [w * 0.15, w * 0.42, w * 0.69]) {
      ctx.fillStyle = '#060818';
      ctx.beginPath();
      ctx.moveTo(wx, floorY * 0.45);
      ctx.lineTo(wx, floorY * 0.1 + 20);
      ctx.quadraticCurveTo(wx + 45, floorY * 0.1 - 10, wx + 90, floorY * 0.1 + 20);
      ctx.lineTo(wx + 90, floorY * 0.45);
      ctx.fill();
      ctx.strokeStyle = '#3d3060';
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    // Grand chandelier
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(w * 0.5, 0); ctx.lineTo(w * 0.5, 20); ctx.stroke();
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w * 0.35, 25); ctx.lineTo(w * 0.65, 25); ctx.stroke();
    for (const dx of [-60, -30, 0, 30, 60]) {
      this.drawCandle(ctx, w * 0.5 + dx, 30, t, dx * 0.05);
    }

    // Floating magical orbs
    ctx.globalAlpha = 0.2 + Math.sin(t) * 0.1;
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath(); ctx.arc(w * 0.2, h * 0.3, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w * 0.8, h * 0.25, 4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    this.drawCauldron(ctx, w * 0.5, floorY, 60, t);
    this.drawShelves(ctx, w * 0.7, floorY - 180, 100, 140, t);
    this.drawWorkbench(ctx, w * 0.03, floorY - 30, 100, 30);
    this.drawIngredientJars(ctx, w * 0.15, floorY - 15, t);
    this.drawDoor(ctx, w * 0.87, floorY - 160, 60, 160);

    this.drawLighting(ctx, w, h, t);
  }

  // ── Object Drawers ────────────────────────────────────

  private drawCauldron(ctx: CanvasRenderingContext2D, cx: number, floorY: number, r: number, t: number): void {
    // Legs
    ctx.fillStyle = '#2d2555';
    ctx.fillRect(cx - r * 0.7, floorY - 8, 8, 8);
    ctx.fillRect(cx + r * 0.7 - 8, floorY - 8, 8, 8);

    // Body
    ctx.fillStyle = '#1a1530';
    ctx.beginPath();
    ctx.ellipse(cx, floorY - r * 0.5, r, r * 0.7, 0, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#3d3060';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Rim
    ctx.fillStyle = '#3d3060';
    ctx.beginPath();
    ctx.ellipse(cx, floorY - r * 0.9, r * 0.95, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Liquid
    const liqColor = this.isBrewing ? '#a855f7' : '#4a3d6a';
    const liqAlpha = this.isBrewing ? 0.7 + Math.sin(t * 4) * 0.1 : 0.4;
    ctx.globalAlpha = liqAlpha;
    ctx.fillStyle = liqColor;
    ctx.beginPath();
    ctx.ellipse(cx, floorY - r * 0.85, r * 0.8, r * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Handle
    ctx.strokeStyle = '#4a3d6a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, floorY - r * 1.1, r * 0.4, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();

    // Highlight
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.3, floorY - r * 0.6, r * 0.2, r * 0.35, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawShelves(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number): void {
    // Back panel
    ctx.fillStyle = '#2a1a0e';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#3d2815';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Shelves
    const shelfCount = 3;
    const shelfH = h / shelfCount;
    for (let i = 0; i < shelfCount; i++) {
      const sy = y + shelfH * (i + 1) - 3;
      ctx.fillStyle = '#4a3520';
      ctx.fillRect(x - 3, sy, w + 6, 6);

      // Potion bottles on shelf
      const bottlesOnShelf = Math.min(3, Math.max(0, Math.ceil(this.potionCount / shelfCount) - (shelfCount - 1 - i) * 0));
      const colors = ['#a855f7', '#fb923c', '#f87171', '#60a5fa', '#4ade80'];
      for (let b = 0; b < Math.min(bottlesOnShelf, 3); b++) {
        const bx = x + 12 + b * 22;
        const by = sy - 20;
        const color = colors[(i * 3 + b) % colors.length];
        // Bottle
        ctx.fillStyle = '#1a1530';
        ctx.fillRect(bx, by + 3, 12, 17);
        ctx.fillRect(bx + 3, by, 6, 5);
        // Liquid
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(bx + 2, by + 10, 8, 8);
        ctx.globalAlpha = 1;
      }
    }
  }

  private drawWorkbench(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    // Table top
    ctx.fillStyle = '#4a3520';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#3d2815';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Legs
    ctx.fillStyle = '#3d2815';
    ctx.fillRect(x + 5, y + h, 6, 30);
    ctx.fillRect(x + w - 11, y + h, 6, 30);

    // Tools on bench
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(x + 15, y - 5, 20, 3); // ruler
    ctx.fillStyle = '#92400e';
    ctx.fillRect(x + 45, y - 8, 5, 8); // mortar
    ctx.beginPath();
    ctx.arc(x + 47.5, y - 8, 7, Math.PI, 0);
    ctx.fillStyle = '#78350f';
    ctx.fill();
  }

  private drawIngredientJars(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
    const colors = ['#4ade80', '#f87171', '#fde047', '#c4b5fd', '#fb923c'];
    const count = Math.min(5, Math.max(1, Math.ceil(this.ingredientCount / 5)));

    for (let i = 0; i < count; i++) {
      const jx = x + i * 16;
      const jy = y - 22;
      // Jar
      ctx.fillStyle = 'rgba(200, 200, 220, 0.15)';
      ctx.fillRect(jx, jy, 12, 18);
      ctx.fillRect(jx + 2, jy - 3, 8, 4);
      // Contents
      ctx.fillStyle = colors[i % colors.length];
      ctx.globalAlpha = 0.5;
      ctx.fillRect(jx + 2, jy + 8, 8, 8);
      ctx.globalAlpha = 1;
    }
  }

  private drawDoor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    // Frame
    ctx.fillStyle = '#3d2815';
    ctx.fillRect(x - 4, y - 4, w + 8, h + 4);
    // Door
    ctx.fillStyle = '#2a1a0e';
    ctx.fillRect(x, y, w, h);
    // Planks
    ctx.strokeStyle = '#1a0e06';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.33, y); ctx.lineTo(x + w * 0.33, y + h);
    ctx.moveTo(x + w * 0.66, y); ctx.lineTo(x + w * 0.66, y + h);
    ctx.stroke();
    // Handle
    ctx.fillStyle = '#b8860b';
    ctx.beginPath();
    ctx.arc(x + w * 0.75, y + h * 0.5, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawCandle(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, phase: number): void {
    // Stick
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(x - 2, y, 4, 15);
    // Holder
    ctx.fillStyle = '#92400e';
    ctx.fillRect(x - 5, y + 15, 10, 4);

    // Flame
    const flicker = Math.sin(t * 8 + phase) * 1.5;
    const size = 4 + Math.sin(t * 6 + phase * 2) * 1;

    ctx.fillStyle = '#fbbf24';
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.ellipse(x + flicker * 0.3, y - size, size * 0.5, size, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fef3c7';
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.ellipse(x, y - size * 0.5, size * 0.25, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ── Lighting ──────────────────────────────────────────

  private drawLighting(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    // Ambient darkness overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, w, h);

    // Light sources punch through darkness
    ctx.globalCompositeOperation = 'lighter';

    for (const candle of this.candles) {
      const flicker = Math.sin(t * 5 + candle.flicker) * 8;
      const radius = candle.baseRadius + flicker;
      const [r, g, b] = hexToRgb(candle.color);
      const grad = ctx.createRadialGradient(candle.x, candle.y, 0, candle.x, candle.y, radius);
      grad.addColorStop(0, `rgba(${r},${g},${b},0.15)`);
      grad.addColorStop(0.5, `rgba(${r},${g},${b},0.06)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(candle.x - radius, candle.y - radius, radius * 2, radius * 2);
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  // ── Particles ─────────────────────────────────────────

  private drawDust(ctx: CanvasRenderingContext2D): void {
    for (const p of this.dustParticles) {
      const lifeRatio = p.life / p.maxLife;
      const alpha = p.alpha * (lifeRatio < 0.2 ? lifeRatio / 0.2 : lifeRatio > 0.8 ? (1 - lifeRatio) / 0.2 : 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawBubbles(ctx: CanvasRenderingContext2D): void {
    for (const b of this.bubbles) {
      ctx.globalAlpha = b.alpha;
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.stroke();
      // Highlight
      ctx.fillStyle = '#c4b5fd';
      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawSteam(ctx: CanvasRenderingContext2D): void {
    for (const p of this.steamParticles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ── Hotspot Highlights ────────────────────────────────

  private drawHotspots(ctx: CanvasRenderingContext2D): void {
    const idleTime = this.time - this.lastInteractionTime;
    const showIdle = idleTime > 3; // Show hints after 3s of no interaction

    for (const hs of this.hotspots) {
      // Always-on idle hint: subtle pulsing dot at hotspot center
      if (showIdle && !hs.hovered) {
        const cx = hs.x + hs.w / 2;
        const cy = hs.y + hs.h / 2;
        const pulse = Math.sin(this.time * 2.5 + cx * 0.01) * 0.5 + 0.5;
        const r = 3 + pulse * 3;
        ctx.globalAlpha = 0.2 + pulse * 0.25;
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        // Outer ring
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 4 + pulse * 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      if (!hs.hovered) continue;
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      this.roundRect(ctx, hs.x, hs.y, hs.w, hs.h, 6);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(168, 85, 247, 0.06)';
      this.roundRect(ctx, hs.x, hs.y, hs.w, hs.h, 6);
      ctx.fill();
    }
  }

  private drawTooltip(ctx: CanvasRenderingContext2D): void {
    if (!this.hoveredHotspot) return;
    const hs = this.hotspots.find(h => h.id === this.hoveredHotspot);
    if (!hs) return;

    const text = hs.label;
    ctx.font = '600 13px Inter, sans-serif';
    const metrics = ctx.measureText(text);
    const tw = metrics.width + 16;
    const th = 28;
    let tx = hs.x + hs.w / 2 - tw / 2;
    let ty = hs.y - th - 6;
    if (ty < 4) ty = hs.y + hs.h + 6;
    if (tx < 4) tx = 4;
    if (tx + tw > this.width - 4) tx = this.width - tw - 4;

    ctx.fillStyle = 'rgba(22, 18, 41, 0.92)';
    this.roundRect(ctx, tx, ty, tw, th, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, tx, ty, tw, th, 6);
    ctx.stroke();

    ctx.fillStyle = '#e2ddf5';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, tx + tw / 2, ty + th / 2);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  // ── Helpers ───────────────────────────────────────────

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
