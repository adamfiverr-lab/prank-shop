import { GameEngine } from '../../engine/GameEngine';
import { FORAGE_ZONES } from '../../data/foraging';
import { getIngredient } from '../../data/ingredients';
import { showToast } from '../Toast';
import { formatTime } from '../helpers';
import { icon, ZONE_ICONS } from '../icons';

export function renderForaging(engine: GameEngine, navigate: (screen: string) => void): HTMLElement {
  const root = document.createElement('div');
  let timerInterval: number | null = null;

  function render() {
    if (timerInterval) clearInterval(timerInterval);

    const zones = Object.values(FORAGE_ZONES);
    const resetTime = engine.getForageResetTimeRemaining();

    root.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">${icon('leaf', 18, '#4ade80')} Foraging</span>
          <span class="text-sm text-dim">Spend mana to gather ingredients</span>
        </div>
        <div class="flex items-center justify-between mb-8">
          <span class="text-sm">Forages: <strong>${engine.foragesRemaining}</strong>/${engine.getMaxForages()}</span>
          <span class="text-sm timer" id="reset-timer">${resetTime > 0 ? `Reset: ${formatTime(resetTime)}` : ''}</span>
        </div>
        <div class="progress-bar mb-8">
          <div class="fill green" style="width:${(engine.foragesRemaining / engine.getMaxForages()) * 100}%;"></div>
        </div>
      </div>

      <div class="forage-grid">
        ${zones.map(zone => {
          const check = engine.canForage(zone.id);
          const locked = engine.getRank().level < zone.unlockLevel;
          return `
            <div class="forage-spot ${!check.ok ? 'depleted' : ''}" data-zone="${zone.id}">
              <div class="spot-icon">${locked ? icon('lock', 32) : icon(ZONE_ICONS[zone.id] || 'meadow', 36)}</div>
              <div class="spot-name">${zone.name}</div>
              <div class="spot-cost">${locked ? `Lvl ${zone.unlockLevel}` : `${zone.manaCost} ${icon('mana', 12)}`}</div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="panel mt-12">
        <div class="panel-title mb-8">${icon('herb', 16)} Ingredient Stash</div>
        ${Object.entries(engine.ingredients).filter(([,c]) => c > 0).length === 0 ? `
          <div class="text-sm text-dim text-center" style="padding:12px;">No ingredients yet. Tap a zone above!</div>
        ` : `
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            ${Object.entries(engine.ingredients).filter(([,c]) => c > 0).map(([id, count]) => {
              const ing = getIngredient(id);
              if (!ing) return '';
              return `<span class="ingredient-chip">
                <span class="dot" style="background:${ing.color};"></span>
                ${ing.name}
                <span class="count">${count}</span>
              </span>`;
            }).join('')}
          </div>
        `}
      </div>
    `;

    root.querySelectorAll('.forage-spot:not(.depleted)').forEach(el => {
      el.addEventListener('click', () => {
        const zoneId = el.getAttribute('data-zone')!;
        const result = engine.forage(zoneId);
        if (result) {
          const ing = getIngredient(result.ingredientId);
          const rarity = ing?.rarity || 'common';
          showToast(
            `Found ${result.ingredientName}!`,
            rarity === 'rare' ? 'gold' : rarity === 'uncommon' ? 'info' : 'success'
          );
          render();
        } else {
          const check = engine.canForage(zoneId);
          showToast(check.reason || 'Cannot forage', 'error');
        }
      });
    });

    timerInterval = window.setInterval(() => {
      const timerEl = root.querySelector('#reset-timer');
      if (timerEl) {
        const remaining = engine.getForageResetTimeRemaining();
        timerEl.textContent = remaining > 0 ? `Reset: ${formatTime(remaining)}` : '';
        if (remaining <= 0) render();
      }
    }, 1000);
  }

  render();
  return root;
}
