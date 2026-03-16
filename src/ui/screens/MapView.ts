import { GameEngine } from '../../engine/GameEngine';
import { FORAGE_ZONES } from '../../data/foraging';
import { DISTRIBUTORS } from '../../data/distributors';
import { icon, DISTRIBUTOR_ICONS, ZONE_ICONS } from '../icons';

export interface MapLocation {
  id: string;
  type: 'base' | 'distributor' | 'zone' | 'shop';
  label: string;
  x: number; // percent
  y: number; // percent
  iconName: string;
  locked: boolean;
  badge?: string;
}

export function getMapLocations(engine: GameEngine): MapLocation[] {
  const locations: MapLocation[] = [];
  const base = engine.getCurrentBase();

  // Your base — center
  locations.push({
    id: 'base',
    type: 'base',
    label: base.name,
    x: 50,
    y: 45,
    iconName: 'base_' + engine.baseTier,
    locked: false,
  });

  // Distributors — scattered around town
  const distPositions: Record<string, [number, number]> = {
    grix: [25, 30],
    whisper: [78, 22],
    skrag: [18, 68],
    barnaby: [80, 55],
    patches: [50, 80],
  };

  for (const dist of Object.values(engine.distributors)) {
    const pos = distPositions[dist.id] || [50, 50];
    const hasGold = dist.goldEarned > 0;
    locations.push({
      id: `dist_${dist.id}`,
      type: 'distributor',
      label: dist.def.name,
      x: pos[0],
      y: pos[1],
      iconName: DISTRIBUTOR_ICONS[dist.id] || 'goblin',
      locked: !dist.unlocked,
      badge: hasGold ? `${dist.goldEarned}g` : undefined,
    });
  }

  // Foraging zones — outer ring
  const zonePositions: Record<string, [number, number]> = {
    meadow: [12, 18],
    swamp: [88, 75],
    caves: [8, 48],
    ruins: [65, 12],
    skyreach: [92, 15],
  };

  for (const zone of Object.values(FORAGE_ZONES)) {
    const pos = zonePositions[zone.id] || [50, 50];
    const locked = engine.getRank().level < zone.unlockLevel;
    locations.push({
      id: `zone_${zone.id}`,
      type: 'zone',
      label: zone.name,
      x: pos[0],
      y: pos[1],
      iconName: ZONE_ICONS[zone.id] || 'meadow',
      locked,
    });
  }

  return locations;
}

export function renderMapView(engine: GameEngine, onLocationClick: (id: string) => void): HTMLElement {
  const root = document.createElement('div');
  root.className = 'map-container';

  const locations = getMapLocations(engine);

  // SVG background map
  root.innerHTML = `
    <svg class="map-bg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="mapGrad" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stop-color="#1a2e1a" />
          <stop offset="50%" stop-color="#0f1a0f" />
          <stop offset="100%" stop-color="#0a0e14" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="softGlow">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="400" height="300" fill="url(#mapGrad)"/>

      <!-- Terrain features -->
      <!-- Hills -->
      <ellipse cx="350" cy="60" rx="60" ry="25" fill="#1a2a1a" opacity=".4"/>
      <ellipse cx="355" cy="55" rx="50" ry="20" fill="#1f301f" opacity=".3"/>

      <!-- Water -->
      <path d="M160 260 Q200 250 240 265 Q280 275 320 260" stroke="#1a3a5a" stroke-width="3" fill="none" opacity=".3"/>
      <path d="M180 270 Q220 258 260 272" stroke="#1a3a5a" stroke-width="2" fill="none" opacity=".2"/>

      <!-- Paths connecting locations -->
      <g stroke="#3a3520" stroke-width="1.5" fill="none" opacity=".4" stroke-dasharray="4,4">
        <!-- base to grix -->
        <path d="M200 135 L100 90"/>
        <!-- base to whisper -->
        <path d="M200 135 L312 66"/>
        <!-- base to skrag -->
        <path d="M200 135 L72 204"/>
        <!-- base to barnaby -->
        <path d="M200 135 L320 165"/>
        <!-- base to patches -->
        <path d="M200 135 L200 240"/>
      </g>

      <!-- Trees scattered -->
      ${generateTrees()}

      <!-- Stars / ambient particles -->
      ${generateStars()}
    </svg>

    <div class="map-locations">
      ${locations.map(loc => `
        <div class="map-pin ${loc.type} ${loc.locked ? 'locked' : ''} ${loc.badge ? 'has-badge' : ''}"
             style="left:${loc.x}%;top:${loc.y}%;"
             data-loc="${loc.id}"
             title="${loc.label}">
          <div class="map-pin-icon">
            ${loc.locked ? icon('lock', 28) : renderMapIcon(loc)}
          </div>
          <div class="map-pin-label">${loc.label}</div>
          ${loc.badge ? `<div class="map-pin-badge">${loc.badge}</div>` : ''}
          ${loc.type === 'base' ? '<div class="map-pin-pulse"></div>' : ''}
        </div>
      `).join('')}
    </div>
  `;

  // Click handlers
  root.querySelectorAll('.map-pin:not(.locked)').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-loc')!;
      onLocationClick(id);
    });
  });

  return root;
}

function renderMapIcon(loc: MapLocation): string {
  if (loc.type === 'base') return renderBaseIcon(loc.iconName);
  if (loc.type === 'distributor') return icon(loc.iconName, 36);
  if (loc.type === 'zone') return icon(loc.iconName, 36);
  return icon('sparkle', 28);
}

function renderBaseIcon(tierId: string): string {
  const bases: Record<string, string> = {
    base_attic: `<svg width="44" height="44" viewBox="0 0 48 48">
      <rect x="12" y="22" width="24" height="20" rx="2" fill="#4a3728"/>
      <polygon points="8,24 24,8 40,24" fill="#6b4423"/>
      <rect x="20" y="30" width="8" height="12" rx="1" fill="#2d1b10"/>
      <rect x="26" y="14" width="3" height="12" fill="#8b7355"/>
      <rect x="14" y="26" width="5" height="5" rx="1" fill="#fde68a" opacity=".4"/>
    </svg>`,
    base_cottage: `<svg width="44" height="44" viewBox="0 0 48 48">
      <rect x="10" y="20" width="28" height="22" rx="2" fill="#5c4033"/>
      <polygon points="6,22 24,6 42,22" fill="#8b6914"/>
      <rect x="19" y="28" width="10" height="14" rx="1" fill="#3d2b1f"/>
      <circle cx="16" cy="12" r="6" fill="#4ade80" opacity=".3"/>
      <rect x="12" y="24" width="5" height="5" rx="1" fill="#fde68a" opacity=".5"/>
      <rect x="31" y="24" width="5" height="5" rx="1" fill="#fde68a" opacity=".5"/>
    </svg>`,
    base_tower: `<svg width="44" height="44" viewBox="0 0 48 48">
      <rect x="16" y="14" width="16" height="30" rx="2" fill="#4a4060"/>
      <polygon points="14,16 24,2 34,16" fill="#5b4c8a"/>
      <rect x="20" y="32" width="8" height="12" rx="1" fill="#2d2555"/>
      <rect x="18" y="18" width="4" height="4" rx="1" fill="#60a5fa" opacity=".5"/>
      <rect x="26" y="18" width="4" height="4" rx="1" fill="#60a5fa" opacity=".5"/>
      <rect x="18" y="25" width="4" height="4" rx="1" fill="#fde68a" opacity=".4"/>
      <rect x="26" y="25" width="4" height="4" rx="1" fill="#fde68a" opacity=".4"/>
      <circle cx="24" cy="8" r="2" fill="#fbbf24" opacity=".7"/>
    </svg>`,
    base_manor: `<svg width="44" height="44" viewBox="0 0 48 48">
      <rect x="6" y="18" width="36" height="26" rx="2" fill="#3d3060"/>
      <polygon points="4,20 24,4 44,20" fill="#4c3d80"/>
      <rect x="8" y="8" width="4" height="14" fill="#5b4c8a"/>
      <rect x="36" y="8" width="4" height="14" fill="#5b4c8a"/>
      <rect x="20" y="28" width="8" height="16" rx="1" fill="#1e1838"/>
      <rect x="9" y="22" width="5" height="5" rx="1" fill="#a78bfa" opacity=".4"/>
      <rect x="17" y="22" width="5" height="5" rx="1" fill="#fde68a" opacity=".4"/>
      <rect x="26" y="22" width="5" height="5" rx="1" fill="#fde68a" opacity=".4"/>
      <rect x="34" y="22" width="5" height="5" rx="1" fill="#a78bfa" opacity=".4"/>
    </svg>`,
    base_castle: `<svg width="44" height="44" viewBox="0 0 48 48">
      <rect x="4" y="16" width="40" height="28" rx="2" fill="#2d2555"/>
      <rect x="4" y="12" width="6" height="32" fill="#3d3060"/>
      <rect x="38" y="12" width="6" height="32" fill="#3d3060"/>
      <rect x="4" y="8" width="6" height="4" fill="#4c3d80"/>
      <rect x="38" y="8" width="6" height="4" fill="#4c3d80"/>
      <polygon points="12,18 24,2 36,18" fill="#4c3d80"/>
      <rect x="20" y="28" width="8" height="16" rx="1" fill="#1e1838"/>
      <rect x="14" y="20" width="4" height="5" rx="1" fill="#fbbf24" opacity=".5"/>
      <rect x="30" y="20" width="4" height="5" rx="1" fill="#fbbf24" opacity=".5"/>
      <rect x="14" y="27" width="4" height="5" rx="1" fill="#a78bfa" opacity=".4"/>
      <rect x="30" y="27" width="4" height="5" rx="1" fill="#a78bfa" opacity=".4"/>
      <circle cx="24" cy="8" r="3" fill="#fbbf24" opacity=".7"/>
      <circle cx="7" cy="10" r="1.5" fill="#a78bfa" opacity=".5"/>
      <circle cx="41" cy="10" r="1.5" fill="#a78bfa" opacity=".5"/>
    </svg>`,
  };
  return bases[tierId] || bases['base_attic'];
}

function generateTrees(): string {
  const positions = [
    [30, 50], [60, 80], [340, 120], [370, 200], [20, 140],
    [100, 200], [300, 230], [150, 50], [280, 40], [50, 250],
    [330, 170], [90, 120], [250, 200], [180, 190], [360, 80],
  ];
  return positions.map(([x, y]) => {
    const h = 8 + Math.random() * 8;
    const w = 4 + Math.random() * 4;
    return `<g opacity="${0.15 + Math.random() * 0.2}">
      <line x1="${x}" y1="${y}" x2="${x}" y2="${y - h}" stroke="#2a4a2a" stroke-width="1.5"/>
      <ellipse cx="${x}" cy="${y - h}" rx="${w}" ry="${h * 0.6}" fill="#1a3a1a"/>
    </g>`;
  }).join('');
}

function generateStars(): string {
  const stars = [];
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * 400;
    const y = Math.random() * 100;
    const r = 0.3 + Math.random() * 0.8;
    const opacity = 0.2 + Math.random() * 0.4;
    stars.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="#fde68a" opacity="${opacity}">
      <animate attributeName="opacity" values="${opacity};${opacity * 0.3};${opacity}" dur="${2 + Math.random() * 4}s" repeatCount="indefinite"/>
    </circle>`);
  }
  return stars.join('');
}
