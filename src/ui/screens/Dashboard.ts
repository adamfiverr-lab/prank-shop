import { GameEngine } from '../../engine/GameEngine';
import { formatGold } from '../helpers';
import { showToast } from '../Toast';
import { icon } from '../icons';

export function renderDashboard(engine: GameEngine, navigate: (screen: string) => void): HTMLElement {
  const root = document.createElement('div');

  const rank = engine.getRank();
  const xpProg = engine.getXpProgress();
  const pendingGold = engine.getPendingGold();
  const base = engine.getCurrentBase();

  root.innerHTML = `
    <div class="panel">
      <div class="flex items-center gap-12 mb-8">
        <div style="display:flex;">${icon('wizard', 44)}</div>
        <div style="flex:1;">
          <div style="font-family:'Cinzel',serif; font-size:18px; font-weight:700; color:var(--text-bright);">${rank.title}</div>
          <div class="text-sm text-dim">Level ${rank.level} Wizard &middot; ${base.name}</div>
          <div class="flex items-center gap-8 mt-8">
            <div class="progress-bar" style="flex:1;">
              <div class="fill purple" style="width:${Math.round(xpProg.fraction * 100)}%;"></div>
            </div>
            <span class="text-sm text-dim">${xpProg.current}/${xpProg.needed} XP</span>
          </div>
        </div>
      </div>
      ${engine.dailyStreak > 1 ? `<div class="text-sm flex items-center gap-4" style="color:var(--orange);">${icon('fire_streak', 16)} ${engine.dailyStreak}-day streak!</div>` : ''}
    </div>

    ${pendingGold > 0 ? `
    <div class="panel" style="border-color: var(--gold-dim); cursor: pointer;" id="collect-gold-panel">
      <div class="flex items-center justify-between">
        <div>
          <div class="panel-title flex items-center gap-8" style="color:var(--gold);">${icon('gold', 20)} Gold Ready!</div>
          <div class="text-sm text-dim">Your distributors earned gold.</div>
        </div>
        <div style="font-size:20px; font-weight:700; color:var(--gold);">${formatGold(pendingGold)}g</div>
      </div>
      <button class="btn btn-gold btn-block mt-12" id="collect-all-btn">Collect All Gold</button>
    </div>
    ` : ''}

    <div class="panel">
      <div class="panel-title mb-8">Quick Actions</div>
      <div class="grid-2">
        <button class="btn btn-primary btn-block flex items-center gap-4" id="go-brew">${icon('flask', 16, 'white')} Brew</button>
        <button class="btn btn-green btn-block flex items-center gap-4" id="go-forage">${icon('leaf', 16, '#002200')} Forage</button>
        <button class="btn btn-outline btn-block flex items-center gap-4" id="go-dist">${icon('box', 16)} Distributors</button>
        <button class="btn btn-outline btn-block flex items-center gap-4" id="go-upgrades">${icon('upgrade', 16)} Upgrades</button>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title mb-8">Stats</div>
      <div class="flex flex-col gap-4">
        <div class="flex justify-between"><span class="text-dim">Total Brews</span><span>${engine.totalBrews}</span></div>
        <div class="flex justify-between"><span class="text-dim">Total Sales</span><span>${engine.totalSales}</span></div>
        <div class="flex justify-between"><span class="text-dim">Gold Earned (all time)</span><span class="text-gold">${formatGold(engine.totalGoldEarned)}g</span></div>
        <div class="flex justify-between"><span class="text-dim">Recipes Discovered</span><span>${engine.discoveredRecipes.size}</span></div>
        <div class="flex justify-between"><span class="text-dim">Ingredients in Stock</span><span>${Object.values(engine.ingredients).reduce((a, b) => a + b, 0)}</span></div>
        <div class="flex justify-between"><span class="text-dim">Potions in Inventory</span><span>${engine.inventory.length}</span></div>
      </div>
    </div>

    <div style="text-align:center; padding:8px;">
      <button class="btn btn-sm btn-outline" style="color:var(--red); border-color:var(--red-dim); font-size:11px;" id="reset-btn">Reset Game</button>
    </div>
  `;

  root.querySelector('#collect-all-btn')?.addEventListener('click', () => {
    const amount = engine.collectAllGold();
    if (amount > 0) {
      showToast(`+${amount}g collected!`, 'gold');
      navigate('dashboard');
    }
  });

  root.querySelector('#go-brew')?.addEventListener('click', () => navigate('brew'));
  root.querySelector('#go-forage')?.addEventListener('click', () => navigate('forage'));
  root.querySelector('#go-dist')?.addEventListener('click', () => navigate('distributors'));
  root.querySelector('#go-upgrades')?.addEventListener('click', () => navigate('upgrades'));

  root.querySelector('#reset-btn')?.addEventListener('click', () => {
    if (confirm('Reset all progress? This cannot be undone.')) {
      engine.resetGame();
    }
  });

  return root;
}
