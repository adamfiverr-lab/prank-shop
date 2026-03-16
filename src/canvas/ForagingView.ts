import { GameEngine } from '../engine/GameEngine';
import { FORAGE_ZONES, type ForageZone } from '../data/foraging';
import { getIngredient } from '../data/ingredients';
import { playRustle, playPlop, playSuccessChime, playBubble } from '../audio/SoundEngine';

// ── Types ───────────────────────────────────────────────

interface GlowSpot {
  x: number; y: number;
  baseSize: number;
  color: string;
  phase: number;
  found: boolean;
  foundTime: number;
  ingredientId: string | null;
  ingredientName: string | null;
}

interface FloatingParticle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; alpha: number;
  color: string; life: number; maxLife: number;
}

interface FoundEffect {
  x: number; y: number;
  name: string; color: string;
  time: number; // when found
  sparks: { x: number; y: number; vx: number; vy: number; life: number; size: number }[];
}

// ── Zone visual themes ──────────────────────────────────

interface ZoneTheme {
  bgTop: string; bgBot: string;
  glowColor: string;
  ambientColor: string;
  groundColor: string;
  featureColor: string;
  particleColor: string;
}

const ZONE_THEMES: Record<string, ZoneTheme> = {
  meadow: { bgTop: '#0a1a0a', bgBot: '#0f2810', glowColor: '#4ade80', ambientColor: '#22c55e', groundColor: '#1a3a18', featureColor: '#2d5a2a', particleColor: '#86efac' },
  swamp: { bgTop: '#0a140a', bgBot: '#0d1f10', glowColor: '#86efac', ambientColor: '#4ade80', groundColor: '#142a14', featureColor: '#1a3a20', particleColor: '#a7f3d0' },
  caves: { bgTop: '#0a0818', bgBot: '#0d0a22', glowColor: '#818cf8', ambientColor: '#6366f1', groundColor: '#1a1530', featureColor: '#2d2555', particleColor: '#c4b5fd' },
  ruins: { bgTop: '#0f0a08', bgBot: '#1a1210', glowColor: '#fbbf24', ambientColor: '#d97706', groundColor: '#2a1f14', featureColor: '#3d2e1f', particleColor: '#fde68a' },
  skyreach: { bgTop: '#060818', bgBot: '#0a1030', glowColor: '#93c5fd', ambientColor: '#3b82f6', groundColor: '#0f1a3a', featureColor: '#1a2a5a', particleColor: '#bfdbfe' },
};

// ── Foraging View ───────────────────────────────────────

export class ForagingView {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private time = 0;
  private running = false;
  private animFrame = 0;

  private engine: GameEngine;
  private zone: ForageZone;
  private theme: ZoneTheme;
  onClose: (() => void) | null = null;

  // Scene
  private spots: GlowSpot[] = [];
  private particles: FloatingParticle[] = [];
  private foundEffects: FoundEffect[] = [];
  private trees: { x: number; h: number; w: number }[] = [];
  private rocks: { x: number; y: number; w: number; h: number }[] = [];

  // UI
  private closeBtnX = 0;
  private closeBtnY = 0;
  private closeBtnR = 18;

  // Zone selector
  private allZones: ForageZone[];
  private zoneBarY = 0;

  constructor(canvas: HTMLCanvasElement, engine: GameEngine, zoneId?: string) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.engine = engine;
    this.allZones = Object.values(FORAGE_ZONES);
    this.zone = FORAGE_ZONES[zoneId || 'meadow'] || this.allZones[0];
    this.theme = ZONE_THEMES[this.zone.id] || ZONE_THEMES.meadow;
    this.resize();
    this.setupEvents();
    this.buildScene();
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
    this.zoneBarY = this.height - 70;
  }

  private buildScene(): void {
    this.spots = [];
    this.trees = [];
    this.rocks = [];
    this.particles = [];
    this.foundEffects = [];

    const w = this.width;
    const h = this.height;
    const spotCount = Math.min(this.engine.foragesRemaining, 6);

    // Generate glow spots (tappable foraging points)
    for (let i = 0; i < spotCount; i++) {
      this.spots.push({
        x: w * 0.15 + Math.random() * w * 0.7,
        y: h * 0.25 + Math.random() * h * 0.4,
        baseSize: 18 + Math.random() * 12,
        color: this.theme.glowColor,
        phase: Math.random() * Math.PI * 2,
        found: false,
        foundTime: 0,
        ingredientId: null,
        ingredientName: null,
      });
    }

    // Generate terrain features
    for (let i = 0; i < 8; i++) {
      this.trees.push({
        x: Math.random() * w,
        h: 40 + Math.random() * 80,
        w: 15 + Math.random() * 25,
      });
    }
    for (let i = 0; i < 5; i++) {
      this.rocks.push({
        x: Math.random() * w,
        y: h * 0.5 + Math.random() * h * 0.25,
        w: 15 + Math.random() * 30,
        h: 10 + Math.random() * 20,
      });
    }

    // Seed ambient particles
    for (let i = 0; i < 30; i++) {
      this.particles.push(this.createParticle(w, h));
    }
  }

  private createParticle(w: number, h: number): FloatingParticle {
    return {
      x: Math.random() * w,
      y: Math.random() * h * 0.8,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -0.2 - Math.random() * 0.5,
      size: 1 + Math.random() * 2.5,
      alpha: 0.1 + Math.random() * 0.3,
      color: this.theme.particleColor,
      life: 0,
      maxLife: 150 + Math.random() * 200,
    };
  }

  private switchZone(zoneId: string): void {
    const z = FORAGE_ZONES[zoneId];
    if (!z) return;
    this.zone = z;
    this.theme = ZONE_THEMES[z.id] || ZONE_THEMES.meadow;
    this.buildScene();
  }

  // ── Events ────────────────────────────────

  private setupEvents(): void {
    window.addEventListener('resize', () => this.resize());

    const getPos = (e: MouseEvent | Touch) => {
      const rect = this.canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    let touchActive = false;

    const onTap = (x: number, y: number) => {
      // Close button
      if (Math.hypot(x - this.closeBtnX, y - this.closeBtnY) < this.closeBtnR + 8) {
        this.stop();
        this.onClose?.();
        return;
      }

      // Zone selector bar
      if (y >= this.zoneBarY) {
        const zoneW = 64;
        const gap = 8;
        const totalW = this.allZones.length * (zoneW + gap) - gap;
        const startX = (this.width - totalW) / 2;
        for (let i = 0; i < this.allZones.length; i++) {
          const zx = startX + i * (zoneW + gap);
          if (x >= zx && x <= zx + zoneW) {
            this.switchZone(this.allZones[i].id);
            return;
          }
        }
        return;
      }

      // Glow spots
      for (const spot of this.spots) {
        if (spot.found) continue;
        const dist = Math.hypot(x - spot.x, y - spot.y);
        if (dist < spot.baseSize * 2) {
          this.tapSpot(spot);
          return;
        }
      }
    };

    this.canvas.addEventListener('click', (e) => {
      if (touchActive) return;
      const p = getPos(e);
      onTap(p.x, p.y);
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      touchActive = true;
      if (e.touches.length > 0) {
        const p = getPos(e.touches[0]);
        onTap(p.x, p.y);
      }
    });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      setTimeout(() => { touchActive = false; }, 300);
    });
  }

  private tapSpot(spot: GlowSpot): void {
    const check = this.engine.canForage(this.zone.id);
    if (!check.ok) return;

    const result = this.engine.forage(this.zone.id);
    if (!result) return;

    spot.found = true;
    spot.foundTime = this.time;
    spot.ingredientId = result.ingredientId;
    spot.ingredientName = result.ingredientName;

    const ing = getIngredient(result.ingredientId);
    const color = ing?.color || this.theme.glowColor;

    // Sound
    playRustle();
    setTimeout(() => playPlop(), 200);
    if (ing?.rarity === 'rare') {
      setTimeout(() => playSuccessChime(), 400);
    } else if (ing?.rarity === 'uncommon') {
      setTimeout(() => playBubble(1.2), 300);
    }

    // Visual effect
    const sparks: FoundEffect['sparks'] = [];
    const sparkCount = ing?.rarity === 'rare' ? 30 : ing?.rarity === 'uncommon' ? 18 : 10;
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      sparks.push({
        x: spot.x, y: spot.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        life: 40 + Math.random() * 40,
        size: 1.5 + Math.random() * 2.5,
      });
    }

    this.foundEffects.push({
      x: spot.x, y: spot.y,
      name: result.ingredientName,
      color,
      time: this.time,
      sparks,
    });
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
    const w = this.width;
    const h = this.height;

    // Ambient particles
    for (const p of this.particles) {
      p.x += p.vx + Math.sin(this.time + p.y * 0.01) * 0.15;
      p.y += p.vy;
      p.life++;
      if (p.life > p.maxLife || p.y < -10 || p.x < -10 || p.x > w + 10) {
        Object.assign(p, this.createParticle(w, h));
        p.y = h * 0.7 + Math.random() * h * 0.3;
      }
    }

    // Found effect sparks
    for (const eff of this.foundEffects) {
      for (let i = eff.sparks.length - 1; i >= 0; i--) {
        const s = eff.sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.05;
        s.life--;
        if (s.life <= 0) eff.sparks.splice(i, 1);
      }
    }
  }

  // ── Draw ──────────────────────────────────

  private draw(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const t = this.time;

    // ── Background gradient ──
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, this.theme.bgTop);
    bgGrad.addColorStop(1, this.theme.bgBot);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // ── Zone-specific background features ──
    this.drawZoneBackground(ctx, w, h, t);

    // ── Ground plane ──
    const groundY = h * 0.65;
    const gGrad = ctx.createLinearGradient(0, groundY, 0, h);
    gGrad.addColorStop(0, this.theme.groundColor);
    gGrad.addColorStop(1, this.theme.bgBot);
    ctx.fillStyle = gGrad;
    ctx.fillRect(0, groundY, w, h - groundY);

    // ── Terrain: trees / rocks ──
    this.drawTerrain(ctx, w, h, t);

    // ── Ambient particles (behind spots) ──
    for (const p of this.particles) {
      const lifeRatio = p.life / p.maxLife;
      const alpha = p.alpha * (lifeRatio < 0.1 ? lifeRatio / 0.1 : lifeRatio > 0.8 ? (1 - lifeRatio) / 0.2 : 1);
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // ── Glow spots ──
    for (const spot of this.spots) {
      if (spot.found) {
        // Fading out glow
        const elapsed = t - spot.foundTime;
        if (elapsed < 2) {
          ctx.globalAlpha = Math.max(0, 1 - elapsed / 2) * 0.3;
          ctx.fillStyle = spot.color;
          ctx.beginPath();
          ctx.arc(spot.x, spot.y, spot.baseSize * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        continue;
      }

      const pulse = Math.sin(t * 2.5 + spot.phase) * 0.3 + 0.7;
      const size = spot.baseSize * pulse;

      // Outer glow (big, soft)
      ctx.globalCompositeOperation = 'lighter';
      const outerGrad = ctx.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, size * 3);
      outerGrad.addColorStop(0, `rgba(${this.hexToRgb(spot.color)},0.15)`);
      outerGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = outerGrad;
      ctx.beginPath();
      ctx.arc(spot.x, spot.y, size * 3, 0, Math.PI * 2);
      ctx.fill();

      // Inner glow (bright core)
      const innerGrad = ctx.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, size);
      innerGrad.addColorStop(0, `rgba(255,255,255,0.6)`);
      innerGrad.addColorStop(0.3, `rgba(${this.hexToRgb(spot.color)},0.5)`);
      innerGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = innerGrad;
      ctx.beginPath();
      ctx.arc(spot.x, spot.y, size, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = 'source-over';

      // Tiny orbiting sparkles
      for (let i = 0; i < 3; i++) {
        const angle = t * 1.5 + spot.phase + i * (Math.PI * 2 / 3);
        const orbitR = size * 1.5;
        const sx = spot.x + Math.cos(angle) * orbitR;
        const sy = spot.y + Math.sin(angle) * orbitR * 0.6;
        ctx.globalAlpha = 0.5 + Math.sin(t * 3 + i) * 0.3;
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ── Found effects (sparkle bursts + text) ──
    for (const eff of this.foundEffects) {
      const elapsed = t - eff.time;

      // Sparks
      for (const s of eff.sparks) {
        const alpha = Math.min(1, s.life / 20);
        ctx.globalAlpha = alpha;
        ctx.globalCompositeOperation = 'lighter';
        const sg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 2);
        sg.addColorStop(0, 'white');
        sg.addColorStop(0.5, eff.color);
        sg.addColorStop(1, 'transparent');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(s.x, s.y, Math.max(0.5, s.size * 2), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = 1;

      // Floating name text
      if (elapsed < 3) {
        const textAlpha = elapsed < 0.3 ? elapsed / 0.3 : elapsed > 2.5 ? (3 - elapsed) / 0.5 : 1;
        const textY = eff.y - 30 - elapsed * 15;
        ctx.globalAlpha = textAlpha;
        ctx.fillStyle = eff.color;
        ctx.font = '700 16px "Cinzel", serif';
        ctx.textAlign = 'center';
        ctx.fillText(eff.name, eff.x, textY);

        // Ingredient rarity glow behind text
        ctx.globalCompositeOperation = 'lighter';
        const tGrad = ctx.createRadialGradient(eff.x, textY, 0, eff.x, textY, 40);
        tGrad.addColorStop(0, `rgba(${this.hexToRgb(eff.color)},0.15)`);
        tGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = tGrad;
        ctx.beginPath();
        ctx.arc(eff.x, textY, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        ctx.textAlign = 'start';
        ctx.globalAlpha = 1;
      }
    }

    // ── UI: Zone name + forages remaining ──
    ctx.fillStyle = 'rgba(10, 8, 24, 0.5)';
    this.roundRect(ctx, 12, 10, 180, 44, 10);
    ctx.fill();
    ctx.fillStyle = this.theme.glowColor;
    ctx.font = '600 14px "Cinzel", serif';
    ctx.fillText(this.zone.name, 22, 30);
    ctx.fillStyle = '#8b83a8';
    ctx.font = '500 11px Inter, sans-serif';
    ctx.fillText(`${this.engine.foragesRemaining} forages left · ${this.zone.manaCost} mana each`, 22, 46);

    // ── Zone selector bar at bottom ──
    this.drawZoneBar(ctx, w, h);

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

  // ── Zone backgrounds ──────────────────────

  private drawZoneBackground(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    switch (this.zone.id) {
      case 'meadow': this.drawMeadowBg(ctx, w, h, t); break;
      case 'swamp': this.drawSwampBg(ctx, w, h, t); break;
      case 'caves': this.drawCavesBg(ctx, w, h, t); break;
      case 'ruins': this.drawRuinsBg(ctx, w, h, t); break;
      case 'skyreach': this.drawSkyreachBg(ctx, w, h, t); break;
    }
  }

  private drawMeadowBg(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    // Moon
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(w * 0.75, h * 0.12, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.1;
    ctx.beginPath();
    ctx.arc(w * 0.75, h * 0.12, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Stars
    for (let i = 0; i < 20; i++) {
      const sx = (i * 137.5) % w;
      const sy = (i * 97.3) % (h * 0.4);
      ctx.globalAlpha = 0.2 + Math.sin(t * 1.5 + i) * 0.15;
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(sx, sy, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Distant hills
    ctx.fillStyle = '#0f2a10';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.55);
    for (let x = 0; x <= w; x += 20) {
      ctx.lineTo(x, h * 0.55 - Math.sin(x * 0.01 + 1) * 25 - Math.sin(x * 0.025) * 15);
    }
    ctx.lineTo(w, h * 0.65);
    ctx.lineTo(0, h * 0.65);
    ctx.fill();
  }

  private drawSwampBg(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    // Fog layers
    for (let i = 0; i < 4; i++) {
      const fogY = h * 0.3 + i * h * 0.1;
      ctx.globalAlpha = 0.04;
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.ellipse(w * 0.5 + Math.sin(t * 0.3 + i) * 30, fogY, w * 0.5, 30, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Water reflections
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#4ade80';
    for (let i = 0; i < 6; i++) {
      const rx = (i * 97 + t * 10) % w;
      const ry = h * 0.68 + Math.sin(t + i) * 5;
      ctx.fillRect(rx, ry, 40 + Math.sin(i) * 20, 2);
    }
    ctx.globalAlpha = 1;
  }

  private drawCavesBg(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    // Stalactites
    for (let i = 0; i < 8; i++) {
      const sx = w * 0.1 + (i / 8) * w * 0.8;
      const sh = 20 + Math.sin(i * 2.3) * 30;
      ctx.fillStyle = '#1a1530';
      ctx.beginPath();
      ctx.moveTo(sx - 8, 0);
      ctx.lineTo(sx, sh);
      ctx.lineTo(sx + 8, 0);
      ctx.fill();
    }

    // Crystal formations
    for (let i = 0; i < 4; i++) {
      const cx = w * 0.15 + (i / 4) * w * 0.7;
      const cy = h * 0.5 + Math.sin(i * 3) * h * 0.1;
      ctx.globalAlpha = 0.15 + Math.sin(t * 2 + i) * 0.08;
      ctx.fillStyle = this.theme.glowColor;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 20);
      ctx.lineTo(cx + 6, cy);
      ctx.lineTo(cx - 6, cy);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  private drawRuinsBg(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    // Broken pillars
    for (let i = 0; i < 3; i++) {
      const px = w * 0.2 + i * w * 0.3;
      const ph = 60 + i * 20;
      ctx.fillStyle = '#2a2018';
      ctx.fillRect(px - 10, h * 0.65 - ph, 20, ph);
      ctx.fillRect(px - 14, h * 0.65 - ph, 28, 8);
      // Fallen pieces
      ctx.fillStyle = '#1f180f';
      ctx.fillRect(px + 15, h * 0.65 - 10, 12, 10);
    }

    // Torch on wall
    const torchX = w * 0.85;
    const torchY = h * 0.3;
    ctx.globalCompositeOperation = 'lighter';
    const tGrad = ctx.createRadialGradient(torchX, torchY, 0, torchX, torchY, 50);
    tGrad.addColorStop(0, 'rgba(251,191,36,0.2)');
    tGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = tGrad;
    ctx.beginPath();
    ctx.arc(torchX, torchY, 50 + Math.sin(t * 5) * 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawSkyreachBg(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    // Aurora bands
    for (let i = 0; i < 3; i++) {
      const ay = h * 0.1 + i * h * 0.08;
      ctx.globalAlpha = 0.04 + Math.sin(t * 0.5 + i) * 0.02;
      ctx.fillStyle = i % 2 === 0 ? '#60a5fa' : '#a78bfa';
      ctx.beginPath();
      ctx.moveTo(0, ay);
      for (let x = 0; x <= w; x += 10) {
        ctx.lineTo(x, ay + Math.sin(x * 0.02 + t * 0.5 + i) * 15);
      }
      ctx.lineTo(w, ay + 30);
      ctx.lineTo(0, ay + 30);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Distant mountain silhouette
    ctx.fillStyle = '#0a1030';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.lineTo(w * 0.3, h * 0.25);
    ctx.lineTo(w * 0.5, h * 0.35);
    ctx.lineTo(w * 0.7, h * 0.2);
    ctx.lineTo(w, h * 0.45);
    ctx.lineTo(w, h * 0.65);
    ctx.lineTo(0, h * 0.65);
    ctx.fill();
  }

  // ── Terrain features ──────────────────────

  private drawTerrain(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    const groundY = h * 0.65;

    // Trees (silhouettes)
    for (const tree of this.trees) {
      const ty = groundY - 5;
      // Trunk
      ctx.fillStyle = this.theme.featureColor;
      ctx.fillRect(tree.x - 3, ty - tree.h * 0.4, 6, tree.h * 0.4);
      // Canopy
      ctx.fillStyle = this.theme.featureColor;
      ctx.beginPath();
      ctx.arc(tree.x, ty - tree.h * 0.5, tree.w, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rocks
    for (const rock of this.rocks) {
      ctx.fillStyle = this.theme.featureColor;
      ctx.beginPath();
      ctx.ellipse(rock.x, rock.y, rock.w, rock.h, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Grass blades (meadow/swamp)
    if (this.zone.id === 'meadow' || this.zone.id === 'swamp') {
      ctx.strokeStyle = this.theme.featureColor;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 30; i++) {
        const gx = (i / 30) * w;
        const gy = groundY + Math.random() * 5;
        const sway = Math.sin(t * 1.5 + i * 0.5) * 3;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.quadraticCurveTo(gx + sway, gy - 12, gx + sway * 1.5, gy - 18 - Math.random() * 8);
        ctx.stroke();
      }
    }
  }

  // ── Zone selector bar ─────────────────────

  private drawZoneBar(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    // Background
    ctx.fillStyle = 'rgba(10, 8, 24, 0.7)';
    ctx.fillRect(0, this.zoneBarY - 8, w, h - this.zoneBarY + 8);

    const zoneW = 64;
    const zoneH = 50;
    const gap = 8;
    const totalW = this.allZones.length * (zoneW + gap) - gap;
    const startX = (w - totalW) / 2;

    for (let i = 0; i < this.allZones.length; i++) {
      const z = this.allZones[i];
      const zx = startX + i * (zoneW + gap);
      const zy = this.zoneBarY;
      const isActive = z.id === this.zone.id;
      const locked = this.engine.getRank().level < z.unlockLevel;
      const theme = ZONE_THEMES[z.id] || ZONE_THEMES.meadow;

      // Card bg
      ctx.fillStyle = isActive ? theme.groundColor : '#0d0a1a';
      ctx.globalAlpha = locked ? 0.3 : 1;
      this.roundRect(ctx, zx, zy, zoneW, zoneH, 8);
      ctx.fill();

      if (isActive) {
        ctx.strokeStyle = theme.glowColor;
        ctx.lineWidth = 2;
        this.roundRect(ctx, zx, zy, zoneW, zoneH, 8);
        ctx.stroke();
      }

      // Zone dot
      ctx.fillStyle = locked ? '#4a3d6a' : theme.glowColor;
      ctx.beginPath();
      ctx.arc(zx + zoneW / 2, zy + 18, 8, 0, Math.PI * 2);
      ctx.fill();

      if (locked) {
        // Lock icon
        ctx.fillStyle = '#8b83a8';
        ctx.font = '600 9px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Lv${z.unlockLevel}`, zx + zoneW / 2, zy + 43);
      } else {
        // Zone name
        ctx.fillStyle = isActive ? '#e2ddf5' : '#8b83a8';
        ctx.font = '500 9px Inter, sans-serif';
        ctx.textAlign = 'center';
        const name = z.name.split(' ')[0]; // First word only
        ctx.fillText(name, zx + zoneW / 2, zy + 43);
      }

      ctx.textAlign = 'start';
      ctx.globalAlpha = 1;
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
