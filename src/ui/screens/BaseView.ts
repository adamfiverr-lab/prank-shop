import { GameEngine } from '../../engine/GameEngine';
import { BASE_TIERS, getNextBaseTier } from '../../data/base';
import { showToast } from '../Toast';
import { formatGold } from '../helpers';
import { icon } from '../icons';

export function renderBaseView(engine: GameEngine, navigate: (screen: string) => void): HTMLElement {
  const root = document.createElement('div');

  function render() {
    const base = engine.getCurrentBase();
    const next = getNextBaseTier(engine.baseTier);
    const check = engine.canUpgradeBase();
    const tierIdx = BASE_TIERS.findIndex(t => t.id === base.id);

    root.innerHTML = `
      <div class="panel" style="text-align:center; padding:24px 16px;">
        <div class="base-visual" style="margin-bottom:16px;">
          ${renderBaseSVG(engine.baseTier)}
        </div>
        <div style="font-family:'Cinzel',serif; font-size:20px; font-weight:700; color:var(--text-bright);">${base.name}</div>
        <div class="text-sm text-dim" style="margin-top:4px; max-width:300px; margin-left:auto; margin-right:auto;">${base.description}</div>

        <div class="flex items-center justify-between mt-12" style="max-width:280px; margin-left:auto; margin-right:auto;">
          ${BASE_TIERS.map((t, i) => `
            <div style="width:24px; height:24px; border-radius:50%; border:2px solid ${i <= tierIdx ? 'var(--accent)' : 'var(--border)'}; background:${i <= tierIdx ? 'var(--accent)' : 'transparent'}; display:flex; align-items:center; justify-content:center;">
              ${i <= tierIdx ? icon('check', 14, 'white') : `<span class="text-dim" style="font-size:10px;">${i + 1}</span>`}
            </div>
          `).join('<div style="flex:1; height:2px; background:var(--border);"></div>')}
        </div>
      </div>

      <div class="panel">
        <div class="panel-title mb-8">Features</div>
        <div class="flex flex-col gap-4">
          ${base.features.map(f => `
            <div class="flex items-center gap-8">
              <span style="color:var(--green);">${icon('check', 16, '#4ade80')}</span>
              <span class="text-sm">${f}</span>
            </div>
          `).join('')}
        </div>
        <div class="flex flex-col gap-4 mt-12">
          <div class="flex justify-between text-sm"><span class="text-dim">Brew Slots</span><span>${base.brewSlots}</span></div>
          <div class="flex justify-between text-sm"><span class="text-dim">Storage Capacity</span><span>${base.storageSlots}</span></div>
          <div class="flex justify-between text-sm"><span class="text-dim">Potion Slots</span><span>${base.potionSlots}</span></div>
        </div>
      </div>

      ${next ? `
        <div class="panel" style="border-color:var(--accent-dim);">
          <div class="panel-title mb-8">Next Upgrade</div>
          <div class="flex items-center gap-12 mb-8">
            <div style="width:48px;height:48px;flex-shrink:0;">${renderBaseThumb(next.id)}</div>
            <div>
              <div style="font-weight:600; color:var(--text-bright);">${next.name}</div>
              <div class="text-sm text-dim">${next.description}</div>
            </div>
          </div>
          <div class="flex flex-col gap-4 mb-12">
            <div class="flex justify-between text-sm"><span class="text-dim">Cost</span><span class="text-gold">${formatGold(next.cost)}g</span></div>
            <div class="flex justify-between text-sm"><span class="text-dim">Requires Level</span><span>${next.level}</span></div>
            <div class="flex justify-between text-sm"><span class="text-dim">Brew Slots</span><span>${base.brewSlots} → ${next.brewSlots}</span></div>
            <div class="flex justify-between text-sm"><span class="text-dim">Storage</span><span>${base.storageSlots} → ${next.storageSlots}</span></div>
            <div class="flex justify-between text-sm"><span class="text-dim">Potion Slots</span><span>${base.potionSlots} → ${next.potionSlots}</span></div>
          </div>
          <button class="btn btn-primary btn-block" id="upgrade-base-btn" ${!check.ok ? 'disabled' : ''}>
            ${check.ok ? `Upgrade to ${next.name}` : check.reason}
          </button>
        </div>
      ` : `
        <div class="panel" style="text-align:center; border-color:var(--gold-dim);">
          <div style="font-size:32px; margin-bottom:8px;">${icon('sparkle', 40, '#fbbf24')}</div>
          <div style="font-family:'Cinzel',serif; font-size:16px; color:var(--gold);">Maximum Power!</div>
          <div class="text-sm text-dim">Your castle stands as a monument to your mastery.</div>
        </div>
      `}

      <button class="btn btn-outline btn-block mt-8" id="back-map">Back to Map</button>
    `;

    root.querySelector('#upgrade-base-btn')?.addEventListener('click', () => {
      if (engine.upgradeBase()) {
        const newBase = engine.getCurrentBase();
        showToast(`Upgraded to ${newBase.name}!`, 'success');
        render();
      }
    });

    root.querySelector('#back-map')?.addEventListener('click', () => navigate('map'));
  }

  render();
  return root;
}

function renderBaseSVG(tierId: string): string {
  const svgs: Record<string, string> = {
    attic: `<svg width="200" height="140" viewBox="0 0 200 140">
      <!-- Background: tavern building -->
      <rect x="30" y="50" width="140" height="80" rx="3" fill="#3d2b1f"/>
      <polygon points="20,55 100,10 180,55" fill="#5c3a1e"/>
      <!-- Attic window (yours, glowing) -->
      <rect x="82" y="20" width="36" height="24" rx="2" fill="#1a0e08" stroke="#5c3a1e" stroke-width="1.5"/>
      <rect x="86" y="24" width="12" height="16" rx="1" fill="#fde68a" opacity=".4"/>
      <rect x="102" y="24" width="12" height="16" rx="1" fill="#fde68a" opacity=".3"/>
      <!-- Tavern windows -->
      <rect x="48" y="65" width="20" height="20" rx="2" fill="#fde68a" opacity=".2"/>
      <rect x="90" y="65" width="20" height="20" rx="2" fill="#fde68a" opacity=".15"/>
      <rect x="132" y="65" width="20" height="20" rx="2" fill="#fde68a" opacity=".2"/>
      <!-- Door -->
      <rect x="88" y="100" width="24" height="30" rx="2" fill="#2d1b10"/>
      <!-- Chimney -->
      <rect x="140" y="18" width="14" height="35" fill="#4a3020"/>
      <!-- Smoke -->
      <circle cx="147" cy="14" r="4" fill="#6b7280" opacity=".2"><animate attributeName="cy" values="14;6;14" dur="4s" repeatCount="indefinite"/></circle>
      <circle cx="150" cy="10" r="3" fill="#6b7280" opacity=".15"><animate attributeName="cy" values="10;2;10" dur="3s" repeatCount="indefinite"/></circle>
      <!-- Sign -->
      <rect x="60" y="92" width="20" height="12" rx="2" fill="#78350f" transform="rotate(-5 70 98)"/>
    </svg>`,
    cottage: `<svg width="200" height="140" viewBox="0 0 200 140">
      <rect x="40" y="50" width="120" height="70" rx="4" fill="#5c4033"/>
      <polygon points="30,55 100,10 170,55" fill="#8b6914"/>
      <rect x="80" y="85" width="30" height="35" rx="2" fill="#3d2b1f"/>
      <!-- Mushroom cap roof detail -->
      <ellipse cx="100" cy="15" rx="10" ry="6" fill="#a16207" opacity=".3"/>
      <!-- Windows with warm glow -->
      <rect x="50" y="60" width="22" height="18" rx="2" fill="#1a0e08"/><rect x="53" y="63" width="7" height="12" fill="#fde68a" opacity=".5"/><rect x="62" y="63" width="7" height="12" fill="#fde68a" opacity=".4"/>
      <rect x="128" y="60" width="22" height="18" rx="2" fill="#1a0e08"/><rect x="131" y="63" width="7" height="12" fill="#fde68a" opacity=".5"/><rect x="140" y="63" width="7" height="12" fill="#fde68a" opacity=".4"/>
      <!-- Garden -->
      <circle cx="30" cy="115" r="5" fill="#4ade80" opacity=".3"/>
      <circle cx="20" cy="120" r="4" fill="#4ade80" opacity=".25"/>
      <circle cx="175" cy="118" r="5" fill="#4ade80" opacity=".3"/>
      <!-- Fence -->
      <path d="M15 125 L35 125 M25 125 L25 118 M15 125 L15 118 M35 125 L35 118" stroke="#92400e" stroke-width="1.5" fill="none" opacity=".4"/>
    </svg>`,
    tower: `<svg width="200" height="160" viewBox="0 0 200 160">
      <!-- Tower body -->
      <rect x="65" y="30" width="70" height="120" rx="4" fill="#3d3060"/>
      <!-- Conical roof -->
      <polygon points="55,35 100,0 145,35" fill="#5b4c8a"/>
      <!-- Glowing orb on top -->
      <circle cx="100" cy="5" r="6" fill="#fbbf24" opacity=".6"><animate attributeName="opacity" values=".6;.9;.6" dur="3s" repeatCount="indefinite"/></circle>
      <circle cx="100" cy="5" r="10" fill="#fbbf24" opacity=".1"><animate attributeName="r" values="10;14;10" dur="3s" repeatCount="indefinite"/></circle>
      <!-- Windows -->
      <rect x="78" y="45" width="16" height="14" rx="2" fill="#60a5fa" opacity=".4"/>
      <rect x="106" y="45" width="16" height="14" rx="2" fill="#60a5fa" opacity=".3"/>
      <rect x="78" y="70" width="16" height="14" rx="2" fill="#fde68a" opacity=".4"/>
      <rect x="106" y="70" width="16" height="14" rx="2" fill="#fde68a" opacity=".3"/>
      <rect x="78" y="95" width="16" height="14" rx="2" fill="#a78bfa" opacity=".3"/>
      <rect x="106" y="95" width="16" height="14" rx="2" fill="#a78bfa" opacity=".3"/>
      <!-- Door -->
      <path d="M88 150 L88 125 Q100 115 112 125 L112 150" fill="#1e1838"/>
      <!-- Owl -->
      <ellipse cx="140" cy="55" rx="6" ry="5" fill="#92400e" opacity=".5"/>
      <circle cx="138" cy="53" r="1.5" fill="#fde68a"/><circle cx="142" cy="53" r="1.5" fill="#fde68a"/>
    </svg>`,
    manor: `<svg width="200" height="150" viewBox="0 0 200 150">
      <!-- Main building -->
      <rect x="25" y="40" width="150" height="100" rx="3" fill="#2d2555"/>
      <!-- Roof -->
      <polygon points="20,44 100,8 180,44" fill="#3d3060"/>
      <!-- Towers -->
      <rect x="15" y="20" width="25" height="120" rx="2" fill="#3d3060"/>
      <rect x="160" y="20" width="25" height="120" rx="2" fill="#3d3060"/>
      <polygon points="12,23 27,5 42,23" fill="#4c3d80"/>
      <polygon points="157,23 172,5 187,23" fill="#4c3d80"/>
      <!-- Greenhouse dome -->
      <ellipse cx="100" cy="140" rx="30" ry="10" fill="#4ade80" opacity=".1"/>
      <!-- Many windows -->
      ${[40,60,80,100,120,140].map(x =>
        `<rect x="${x}" y="52" width="12" height="10" rx="1" fill="#a78bfa" opacity=".3"/>`
      ).join('')}
      ${[40,60,80,100,120,140].map(x =>
        `<rect x="${x}" y="72" width="12" height="10" rx="1" fill="#fde68a" opacity=".3"/>`
      ).join('')}
      <!-- Grand door -->
      <rect x="85" y="100" width="30" height="40" rx="3" fill="#1e1838"/>
      <circle cx="100" cy="120" r="2" fill="#fbbf24" opacity=".5"/>
    </svg>`,
    castle: `<svg width="200" height="160" viewBox="0 0 200 160">
      <!-- Massive structure -->
      <rect x="20" y="35" width="160" height="115" rx="3" fill="#1e1838"/>
      <!-- Central tower -->
      <rect x="75" y="10" width="50" height="140" rx="3" fill="#2d2555"/>
      <polygon points="70,15 100,0 130,15" fill="#3d3060"/>
      <!-- Side towers -->
      <rect x="10" y="25" width="30" height="125" fill="#2d2555"/>
      <rect x="160" y="25" width="30" height="125" fill="#2d2555"/>
      <!-- Battlements -->
      <g fill="#3d3060">${[10,18,26,160,168,176].map(x => `<rect x="${x}" y="20" width="6" height="8"/>`).join('')}</g>
      <g fill="#3d3060">${[75,83,91,99,107,115].map(x => `<rect x="${x}" y="5" width="6" height="8"/>`).join('')}</g>
      <!-- Grand windows with glow -->
      ${[85,105].map(x => `<rect x="${x}" y="25" width="10" height="16" rx="2" fill="#fbbf24" opacity=".5"/>`).join('')}
      ${[30,50,70,90,110,130,150].map(x => `<rect x="${x}" y="50" width="10" height="12" rx="1" fill="#a78bfa" opacity=".3"/>`).join('')}
      ${[30,50,70,90,110,130,150].map(x => `<rect x="${x}" y="72" width="10" height="12" rx="1" fill="#fde68a" opacity=".25"/>`).join('')}
      ${[30,50,70,90,110,130,150].map(x => `<rect x="${x}" y="94" width="10" height="12" rx="1" fill="#60a5fa" opacity=".2"/>`).join('')}
      <!-- Grand entrance -->
      <path d="M85 150 L85 115 Q100 100 115 115 L115 150" fill="#0d0a1a"/>
      <circle cx="100" cy="130" r="3" fill="#fbbf24" opacity=".5"/>
      <!-- Floating orbs -->
      <circle cx="25" cy="22" r="3" fill="#a78bfa" opacity=".5"><animate attributeName="opacity" values=".5;.8;.5" dur="2s" repeatCount="indefinite"/></circle>
      <circle cx="175" cy="22" r="3" fill="#a78bfa" opacity=".5"><animate attributeName="opacity" values=".5;.8;.5" dur="2.5s" repeatCount="indefinite"/></circle>
      <circle cx="100" cy="3" r="4" fill="#fbbf24" opacity=".7"><animate attributeName="opacity" values=".7;1;.7" dur="3s" repeatCount="indefinite"/></circle>
      <!-- Banner -->
      <rect x="93" y="5" width="14" height="2" fill="#7c3aed"/>
    </svg>`,
  };
  return svgs[tierId] || svgs['attic'];
}

function renderBaseThumb(tierId: string): string {
  // Smaller version for next-upgrade preview
  return `<div style="width:48px;height:48px;background:var(--bg-card);border-radius:8px;display:flex;align-items:center;justify-content:center;border:1px solid var(--border);">
    ${icon('upgrade', 24, '#a855f7')}
  </div>`;
}
