import { GameEngine } from '../../engine/GameEngine';
import { UPGRADES } from '../../data/upgrades';
import { showToast } from '../Toast';
import { formatGold } from '../helpers';
import { icon, UPGRADE_ICONS } from '../icons';

export function renderUpgrades(engine: GameEngine, navigate: (screen: string) => void): HTMLElement {
  const root = document.createElement('div');

  function render() {
    const groups: Record<string, typeof UPGRADES[string][]> = {
      'Cauldron': [],
      'Quality': [],
      'Mana': [],
      'Shop': [],
      'Foraging': [],
      'Distributors': [],
    };

    for (const u of Object.values(UPGRADES)) {
      const eff = u.effect.type;
      if (eff === 'brew_speed') groups['Cauldron'].push(u);
      else if (eff === 'quality_bonus') groups['Quality'].push(u);
      else if (eff === 'mana_max' || eff === 'mana_regen') groups['Mana'].push(u);
      else if (eff === 'shelf_slots') groups['Shop'].push(u);
      else if (eff === 'forage_slots') groups['Foraging'].push(u);
      else if (eff === 'distributor_capacity') groups['Distributors'].push(u);
    }

    root.innerHTML = `
      <div class="panel">
        <div class="panel-title mb-8">${icon('upgrade', 18, '#a855f7')} Upgrades</div>
        <div class="text-sm text-dim">Invest gold to improve your operation.</div>
      </div>

      ${Object.entries(groups).map(([groupName, upgrades]) => `
        <div class="panel">
          <div class="panel-title mb-8">${groupName}</div>
          ${upgrades.map(u => {
            const owned = engine.upgrades.has(u.id);
            const check = engine.canBuyUpgrade(u.id);
            const locked = u.requires && !engine.upgrades.has(u.requires);
            const iconName = UPGRADE_ICONS[u.id] || 'sparkle';
            return `
              <div class="upgrade-card ${owned ? 'owned' : ''}">
                <div class="upgrade-icon">${icon(iconName, 28)}</div>
                <div class="upgrade-info">
                  <div class="upgrade-name">${u.name} ${owned ? icon('check', 14, '#4ade80') : ''}</div>
                  <div class="upgrade-desc">${u.description}</div>
                  ${locked ? `<div class="upgrade-desc" style="color:var(--red);">Requires: ${UPGRADES[u.requires!]?.name}</div>` : ''}
                </div>
                ${!owned ? `
                  <button class="btn btn-sm btn-gold" data-buy="${u.id}" ${!check.ok ? 'disabled' : ''}>
                    ${formatGold(u.cost)}g
                  </button>
                ` : `
                  <span class="text-sm text-green">Owned</span>
                `}
              </div>
            `;
          }).join('')}
        </div>
      `).join('')}
    `;

    root.querySelectorAll('[data-buy]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-buy')!;
        if (engine.buyUpgrade(id)) {
          showToast(`Purchased ${UPGRADES[id]?.name}!`, 'success');
          render();
        } else {
          const check = engine.canBuyUpgrade(id);
          showToast(check.reason || 'Cannot purchase', 'error');
        }
      });
    });
  }

  render();
  return root;
}
