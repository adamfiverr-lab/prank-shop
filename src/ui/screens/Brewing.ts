import { GameEngine } from '../../engine/GameEngine';
import { getIngredient } from '../../data/ingredients';
import { showToast } from '../Toast';
import { RECIPES } from '../../data/recipes';
import { icon } from '../icons';

export function renderBrewing(engine: GameEngine, navigate: (screen: string) => void): HTMLElement {
  const root = document.createElement('div');
  let selectedIngredients: string[] = [];

  function render() {
    const ingredientEntries = Object.entries(engine.ingredients).filter(([, count]) => count > 0);
    const recipe = selectedIngredients.length >= 2 ? engine.getBrewableRecipe(selectedIngredients) : null;

    const selectedCounts: Record<string, number> = {};
    for (const id of selectedIngredients) {
      selectedCounts[id] = (selectedCounts[id] || 0) + 1;
    }

    const manaCost = recipe ? 5 + Math.floor(recipe.brewTime / 3) : 0;
    const liquidColor = recipe
      ? (recipe.category === 'potion' ? '#a855f7' : recipe.category === 'candy' ? '#fb923c' : recipe.category === 'prank' ? '#f87171' : '#60a5fa')
      : '#2d2555';

    root.innerHTML = `
      <div class="panel">
        <div class="panel-title mb-8">${icon('flask', 18, '#a855f7')} Brewing Station</div>
        <div class="text-sm text-dim mb-8">Select 2-3 ingredients. Matching tags create recipes.</div>

        <div class="brew-cauldron ${recipe ? 'brewing' : ''}">
          <div class="steam"></div>
          <div class="steam"></div>
          <div class="steam"></div>
          <div class="pot">
            <div class="liquid" style="background:${liquidColor};"></div>
          </div>
        </div>

        <div class="flex items-center justify-between mb-8">
          <span class="text-sm text-dim">Selected: ${selectedIngredients.length}/3</span>
          ${selectedIngredients.length > 0 ? `<button class="btn btn-sm btn-outline" id="clear-btn">${icon('close', 14)} Clear</button>` : ''}
        </div>

        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px; min-height:36px;">
          ${selectedIngredients.map((id, i) => {
            const ing = getIngredient(id);
            return ing ? `<span class="ingredient-chip selected" data-remove="${i}">
              <span class="dot" style="background:${ing.color};"></span>
              ${ing.name} ${icon('close', 10)}
            </span>` : '';
          }).join('')}
          ${selectedIngredients.length === 0 ? '<span class="text-sm text-dim" style="padding:6px;">Tap ingredients below...</span>' : ''}
        </div>

        ${recipe ? `
          <div class="card" style="border-color:var(--accent-dim); margin-bottom:12px;">
            <div class="flex items-center justify-between">
              <div>
                <div style="font-weight:600; color:var(--text-bright);">${recipe.name}</div>
                <div class="text-sm text-dim">${recipe.description}</div>
              </div>
              <span class="category-badge category-${recipe.category}">${recipe.category}</span>
            </div>
            <div class="flex items-center justify-between mt-8">
              <span class="text-sm">Base: <span class="text-gold">${recipe.basePrice}g</span></span>
              <span class="text-sm text-mana">${manaCost} ${icon('mana', 12)}</span>
            </div>
          </div>
        ` : selectedIngredients.length >= 2 ? `
          <div class="card" style="border-color:var(--red-dim); margin-bottom:12px;">
            <div class="text-center text-sm" style="color:var(--red);">No recipe found with these tags. Try different ingredients!</div>
          </div>
        ` : ''}

        <button class="btn btn-primary btn-block" id="brew-btn"
          ${!recipe || engine.mana < manaCost ? 'disabled' : ''}>
          ${!recipe ? 'Select ingredients...' : engine.mana < manaCost ? `Need ${manaCost} mana` : `Brew ${recipe.name}`}
        </button>
      </div>

      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">${icon('herb', 16)} Ingredients</span>
          <span class="text-sm text-dim">${ingredientEntries.length} types</span>
        </div>
        ${ingredientEntries.length === 0 ? `
          <div class="empty-state">
            <div class="icon">${icon('leaf', 40, '#8b83a8')}</div>
            <p>No ingredients. Go foraging!</p>
            <button class="btn btn-sm btn-green mt-12" id="go-forage-btn">${icon('leaf', 14, '#002200')} Forage</button>
          </div>
        ` : `
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            ${ingredientEntries.map(([id, count]) => {
              const ing = getIngredient(id);
              if (!ing) return '';
              const alreadyUsed = selectedCounts[id] || 0;
              const available = count - alreadyUsed;
              const disabled = selectedIngredients.length >= 3 || available <= 0;
              return `<span class="ingredient-chip" data-add="${id}" style="${disabled ? 'opacity:0.4;' : 'cursor:pointer;'}">
                <span class="dot" style="background:${ing.color};"></span>
                ${ing.name}
                <span class="count">${count}</span>
              </span>`;
            }).join('')}
          </div>
        `}
      </div>

      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">${icon('scroll', 16)} Recipe Book</span>
          <span class="text-sm text-dim">${engine.discoveredRecipes.size} discovered</span>
        </div>
        ${engine.discoveredRecipes.size === 0 ? `
          <div class="text-sm text-dim text-center" style="padding:12px;">Brew to discover recipes!</div>
        ` : `
          <div class="flex flex-col gap-4">
            ${Array.from(engine.discoveredRecipes).map(id => {
              const r = RECIPES[id];
              if (!r) return '';
              return `<div class="flex items-center justify-between" style="padding:4px 0;">
                <div class="flex items-center gap-8">
                  <span class="category-badge category-${r.category}">${r.category}</span>
                  <span class="text-sm">${r.name}</span>
                </div>
                <span class="text-sm text-gold">${r.basePrice}g</span>
              </div>`;
            }).join('')}
          </div>
        `}
      </div>
    `;

    root.querySelector('#clear-btn')?.addEventListener('click', () => {
      selectedIngredients = [];
      render();
    });

    root.querySelectorAll('[data-remove]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.getAttribute('data-remove')!);
        selectedIngredients.splice(idx, 1);
        render();
      });
    });

    root.querySelectorAll('[data-add]').forEach(el => {
      el.addEventListener('click', () => {
        if (selectedIngredients.length >= 3) return;
        const id = el.getAttribute('data-add')!;
        const alreadyUsed = selectedIngredients.filter(x => x === id).length;
        if (engine.getIngredientCount(id) - alreadyUsed <= 0) return;
        selectedIngredients.push(id);
        render();
      });
    });

    root.querySelector('#brew-btn')?.addEventListener('click', () => {
      const result = engine.brew(selectedIngredients);
      if (result) {
        const qualLabel = result.potion.quality.charAt(0).toUpperCase() + result.potion.quality.slice(1);
        showToast(
          `Brewed ${qualLabel} ${result.potion.name}!${result.newRecipe ? ' New recipe!' : ''}`,
          result.potion.quality === 'masterwork' ? 'gold' : 'success'
        );
        selectedIngredients = [];
        render();
      } else {
        showToast('Brew failed!', 'error');
      }
    });

    root.querySelector('#go-forage-btn')?.addEventListener('click', () => navigate('forage'));
  }

  render();
  return root;
}
