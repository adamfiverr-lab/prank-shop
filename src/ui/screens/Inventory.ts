import { GameEngine } from '../../engine/GameEngine';
import { getRecipe } from '../../data/recipes';
import { getIngredient } from '../../data/ingredients';
import { icon } from '../icons';

export function renderInventory(engine: GameEngine, navigate: (screen: string) => void): HTMLElement {
  const root = document.createElement('div');

  const potions = engine.inventory;
  const ingredientEntries = Object.entries(engine.ingredients).filter(([, c]) => c > 0);

  root.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">${icon('backpack', 18)} Potions</span>
        <span class="text-sm text-dim">${potions.length}</span>
      </div>

      ${potions.length === 0 ? `
        <div class="empty-state">
          <div class="icon">${icon('flask', 40, '#8b83a8')}</div>
          <p>No potions. Brew something!</p>
          <button class="btn btn-sm btn-primary mt-12" id="go-brew">${icon('flask', 14, 'white')} Brew</button>
        </div>
      ` : `
        <div class="flex flex-col gap-8">
          ${potions.map(p => `
            <div class="card">
              <div class="flex items-center justify-between">
                <div>
                  <span class="quality-badge quality-${p.quality}">${p.quality}</span>
                  <span style="font-weight:600; margin-left:6px;">${p.name}</span>
                </div>
                <span class="category-badge category-${p.category}">${p.category}</span>
              </div>
              <div class="flex items-center justify-between mt-8">
                <span class="text-sm text-dim">${getRecipe(p.recipeId)?.effect || ''}</span>
                <span class="text-sm text-gold">${p.sellPrice}g</span>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="text-sm text-dim text-center mt-12">Assign potions to distributors to sell them!</div>
      `}
    </div>

    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">${icon('herb', 16)} Ingredients</span>
        <span class="text-sm text-dim">${ingredientEntries.reduce((sum, [, c]) => sum + c, 0)} total</span>
      </div>

      ${ingredientEntries.length === 0 ? `
        <div class="empty-state">
          <div class="icon">${icon('leaf', 40, '#8b83a8')}</div>
          <p>No ingredients. Go foraging!</p>
          <button class="btn btn-sm btn-green mt-12" id="go-forage">${icon('leaf', 14, '#002200')} Forage</button>
        </div>
      ` : `
        <div class="flex flex-col gap-4">
          ${ingredientEntries.map(([id, count]) => {
            const ing = getIngredient(id);
            if (!ing) return '';
            return `
              <div class="flex items-center justify-between" style="padding:4px 0;">
                <div class="flex items-center gap-8">
                  <span class="dot" style="width:10px;height:10px;border-radius:50%;background:${ing.color};display:inline-block;"></span>
                  <span>${ing.name}</span>
                  <span class="quality-badge quality-${ing.rarity}" style="font-size:9px;">${ing.rarity}</span>
                </div>
                <span class="text-sm">${count}</span>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;

  root.querySelector('#go-brew')?.addEventListener('click', () => navigate('brew'));
  root.querySelector('#go-forage')?.addEventListener('click', () => navigate('forage'));

  return root;
}
