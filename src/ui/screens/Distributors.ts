import { GameEngine, type Potion, type DistributorState } from '../../engine/GameEngine';
import { DISTRIBUTORS } from '../../data/distributors';
import { showToast } from '../Toast';
import { formatGold, formatTime } from '../helpers';
import { icon, DISTRIBUTOR_ICONS } from '../icons';

export function renderDistributors(engine: GameEngine, navigate: (screen: string) => void): HTMLElement {
  const root = document.createElement('div');
  let assigningTo: string | null = null;
  let timerInterval: number | null = null;

  function cleanup() {
    if (timerInterval) clearInterval(timerInterval);
  }

  function render() {
    cleanup();

    const distributors = Object.values(engine.distributors);

    root.innerHTML = `
      ${assigningTo ? renderAssignModal(engine, assigningTo) : ''}

      <div class="panel">
        <div class="panel-title mb-8">${icon('box', 18)} Distributors</div>
        <div class="text-sm text-dim mb-8">Give potions to distributors. They sell over time — collect gold later!</div>
      </div>

      ${distributors.map(dist => {
        const cap = engine.getDistributorCapacity(dist);
        const nextSale = engine.getDistributorNextSaleTime(dist);
        const distIcon = DISTRIBUTOR_ICONS[dist.id] || 'goblin';

        return `
          <div class="distributor-card">
            <div class="flex items-center gap-12 mb-8">
              <div class="avatar" style="background:${dist.def.color}22; border:2px solid ${dist.def.color}44;">
                ${icon(distIcon, 32)}
              </div>
              <div class="info">
                <div class="name">${dist.def.name}</div>
                <div class="location">${dist.def.location}</div>
              </div>
              ${!dist.unlocked ? `
                <button class="btn btn-sm btn-gold" data-unlock="${dist.id}">
                  Unlock ${formatGold(dist.def.unlockCost)}g
                </button>
              ` : ''}
            </div>

            ${dist.unlocked ? `
              <div class="text-sm text-dim mb-8">${dist.def.description}</div>

              <div class="flex items-center justify-between mb-8">
                <span class="text-sm">Stock: ${dist.stock.length}/${cap}</span>
                ${dist.stock.length > 0 ? `<span class="timer" data-timer="${dist.id}">Next sale: ${formatTime(nextSale)}</span>` : '<span class="text-sm text-dim">Empty</span>'}
              </div>

              <div class="progress-bar mb-8">
                <div class="fill purple" style="width:${(dist.stock.length / cap) * 100}%;"></div>
              </div>

              ${dist.stock.length > 0 ? `
                <div class="flex flex-col gap-4 mb-8" style="padding:4px 0;">
                  ${dist.stock.map(s => `
                    <div class="flex items-center justify-between text-sm">
                      <span>
                        <span class="quality-badge quality-${s.potion.quality}">${s.potion.quality}</span>
                        ${s.potion.name}
                      </span>
                      <span class="text-gold">${s.price}g</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              <div class="flex gap-8">
                <button class="btn btn-sm btn-primary" style="flex:1;" data-assign="${dist.id}"
                  ${dist.stock.length >= cap || engine.inventory.length === 0 ? 'disabled' : ''}>
                  ${engine.inventory.length === 0 ? 'No potions' : dist.stock.length >= cap ? 'Full' : 'Assign Potion'}
                </button>
                ${dist.goldEarned > 0 ? `
                  <button class="btn btn-sm btn-gold" data-collect="${dist.id}">
                    Collect ${formatGold(dist.goldEarned)}g
                  </button>
                ` : ''}
              </div>

              <div class="flex justify-between mt-8 text-sm text-dim">
                <span>Cut: ${Math.round(dist.def.cut * 100)}%</span>
                <span>Sold: ${dist.itemsSold}</span>
              </div>
            ` : `
              <div class="text-sm text-dim">${dist.def.description}</div>
            `}
          </div>
        `;
      }).join('')}
    `;

    // Event handlers
    root.querySelectorAll('[data-unlock]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-unlock')!;
        if (engine.unlockDistributor(id)) {
          showToast(`Unlocked ${engine.distributors[id].def.name}!`, 'success');
          render();
        } else {
          showToast('Not enough gold!', 'error');
        }
      });
    });

    root.querySelectorAll('[data-assign]').forEach(el => {
      el.addEventListener('click', () => {
        assigningTo = el.getAttribute('data-assign')!;
        render();
      });
    });

    root.querySelectorAll('[data-collect]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-collect')!;
        const amount = engine.collectDistributorGold(id);
        if (amount > 0) {
          showToast(`+${amount}g collected!`, 'gold');
          render();
        }
      });
    });

    // Assign modal handlers
    root.querySelector('#close-assign')?.addEventListener('click', () => {
      assigningTo = null;
      render();
    });
    root.querySelector('.modal-overlay')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
        assigningTo = null;
        render();
      }
    });

    root.querySelectorAll('[data-assign-idx]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.getAttribute('data-assign-idx')!);
        if (assigningTo && engine.assignToDistributor(assigningTo, idx)) {
          showToast(`Assigned!`, 'success');
          assigningTo = null;
          render();
        }
      });
    });

    timerInterval = window.setInterval(() => {
      root.querySelectorAll('[data-timer]').forEach(el => {
        const id = el.getAttribute('data-timer')!;
        const dist = engine.distributors[id];
        if (dist && dist.stock.length > 0) {
          el.textContent = `Next sale: ${formatTime(engine.getDistributorNextSaleTime(dist))}`;
        }
      });
    }, 1000);
  }

  render();
  return root;
}

function renderAssignModal(engine: GameEngine, distributorId: string): string {
  const dist = engine.distributors[distributorId];
  if (!dist) return '';

  return `
    <div class="modal-overlay">
      <div class="modal">
        <div class="flex items-center justify-between mb-8">
          <div class="modal-title" style="margin-bottom:0;">Assign to ${dist.def.name}</div>
          <button class="btn btn-sm btn-outline" id="close-assign">${icon('close', 16)}</button>
        </div>
        ${engine.inventory.length === 0 ? `
          <div class="empty-state">
            <div class="icon">${icon('flask', 40, '#8b83a8')}</div>
            <p>No potions to assign. Brew some first!</p>
          </div>
        ` : `
          <div class="flex flex-col gap-8">
            ${engine.inventory.map((p, i) => {
              const demandMult = dist.def.demandMultiplier[p.category] || 1;
              const price = Math.round(p.sellPrice * demandMult);
              const earnings = Math.round(price * (1 - dist.def.cut));
              return `
                <div class="card flex items-center justify-between" data-assign-idx="${i}">
                  <div>
                    <span class="quality-badge quality-${p.quality}">${p.quality}</span>
                    <span style="font-weight:600;">${p.name}</span>
                    <span class="category-badge category-${p.category}" style="margin-left:4px;">${p.category}</span>
                  </div>
                  <div class="text-right">
                    <div class="text-gold text-sm">${price}g</div>
                    <div class="text-dim" style="font-size:10px;">you get ${earnings}g</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}
