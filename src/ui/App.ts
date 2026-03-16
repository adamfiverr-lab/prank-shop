import { GameEngine, type GameEvent } from '../engine/GameEngine';
import { BaseRenderer } from '../canvas/BaseRenderer';
import { BrewingView } from '../canvas/BrewingView';
import { renderMapView } from './screens/MapView';
import { renderBaseView } from './screens/BaseView';
import { renderBrewing } from './screens/Brewing';
import { renderForaging } from './screens/Foraging';
import { renderDistributors } from './screens/Distributors';
import { renderInventory } from './screens/Inventory';
import { renderUpgrades } from './screens/Upgrades';
import { renderDashboard } from './screens/Dashboard';
import { showToast } from './Toast';
import { formatGold } from './helpers';
import { icon } from './icons';
import { startBubbling, stopBubbling, playPlop, playSizzle, playSuccessChime, playMasterworkFanfare, playPour, playRustle, playCoin } from '../audio/SoundEngine';

type Screen = 'home' | 'map' | 'base' | 'brew' | 'forage' | 'distributors' | 'inventory' | 'upgrades' | 'dashboard';

interface NavItem { id: Screen; iconName: string; label: string; }

const NAV_ITEMS: NavItem[] = [
  { id: 'brew', iconName: 'flask', label: 'Brew' },
  { id: 'forage', iconName: 'leaf', label: 'Forage' },
  { id: 'distributors', iconName: 'box', label: 'Sell' },
  { id: 'inventory', iconName: 'backpack', label: 'Items' },
  { id: 'map', iconName: 'home', label: 'Map' },
];

export class App {
  private engine: GameEngine;
  private appEl: HTMLElement;
  private topBarEl!: HTMLElement;
  private bottomBarEl!: HTMLElement;
  private canvasContainer!: HTMLElement;
  private panelLayer!: HTMLElement;
  private canvas!: HTMLCanvasElement;
  private renderer!: BaseRenderer;
  private brewingView: BrewingView | null = null;
  private brewCanvas: HTMLCanvasElement | null = null;
  private currentScreen: Screen = 'home';
  private manaTimerInterval: number | null = null;

  constructor(appEl: HTMLElement) {
    this.appEl = appEl;
    this.engine = new GameEngine();
    this.buildShell();
    this.setupRenderer();
    this.setupEventListeners();
    this.startManaTimer();
    this.showOnboarding();
  }

  private buildShell(): void {
    this.appEl.innerHTML = '';

    // Top bar
    this.topBarEl = document.createElement('div');
    this.topBarEl.className = 'top-bar';
    this.appEl.appendChild(this.topBarEl);

    // Body container
    const body = document.createElement('div');
    body.style.cssText = 'flex:1;position:relative;overflow:hidden;min-height:0;';
    this.appEl.appendChild(body);

    // Canvas
    this.canvasContainer = document.createElement('div');
    this.canvasContainer.style.cssText = 'position:absolute;inset:0;';
    body.appendChild(this.canvasContainer);

    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;';
    this.canvasContainer.appendChild(this.canvas);

    // Panel overlay
    this.panelLayer = document.createElement('div');
    this.panelLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:20;';
    body.appendChild(this.panelLayer);

    // Bottom nav
    this.bottomBarEl = document.createElement('nav');
    this.bottomBarEl.className = 'bottom-nav';
    this.appEl.appendChild(this.bottomBarEl);

    this.updateTopBar();
    this.updateBottomBar();
  }

  private updateTopBar(): void {
    const rank = this.engine.getRank();
    const manaPercent = this.engine.maxMana > 0 ? (this.engine.mana / this.engine.maxMana) * 100 : 0;
    const pending = this.engine.getPendingGold();

    this.topBarEl.innerHTML = `
      <div class="flex items-center gap-8" style="cursor:pointer;" id="top-home">
        <span style="display:flex;">${icon('wizard', 24)}</span>
        <div class="title">Prank & Potion</div>
      </div>
      <div class="resource-bar">
        <div class="resource gold">
          <span class="icon" style="display:flex;">${icon('gold', 16)}</span>
          <span class="value" id="top-gold">${formatGold(this.engine.gold)}</span>
          ${pending > 0 ? `<span class="pending-gold">+${formatGold(pending)}</span>` : ''}
        </div>
        <div class="resource mana">
          <span class="icon" style="display:flex;">${icon('mana', 16)}</span>
          <span class="value" id="top-mana">${this.engine.mana}</span>
          <div class="mana-bar-mini">
            <div class="fill" id="top-mana-bar" style="width:${manaPercent}%;"></div>
          </div>
        </div>
        <div class="resource xp">
          <span class="icon" style="display:flex;">${icon('xp', 16)}</span>
          <span class="value" id="top-level">Lv${rank.level}</span>
        </div>
      </div>
    `;

    this.topBarEl.querySelector('#top-home')?.addEventListener('click', () => this.closePanel());
  }

  private updateBottomBar(): void {
    const pending = this.engine.getPendingGold();

    this.bottomBarEl.innerHTML = NAV_ITEMS.map(item => {
      const active = this.currentScreen === item.id;
      let badge = '';
      if (item.id === 'distributors' && pending > 0) {
        badge = `<span class="badge">${formatGold(pending)}</span>`;
      }
      if (item.id === 'inventory' && this.engine.inventory.length > 0) {
        badge = `<span class="badge">${this.engine.inventory.length}</span>`;
      }
      return `
        <button class="nav-btn ${active ? 'active' : ''}" data-nav="${item.id}">
          ${badge}
          <span class="nav-icon">${icon(item.iconName, 22)}</span>
          <span>${item.label}</span>
        </button>
      `;
    }).join('');

    this.bottomBarEl.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => {
        const screen = el.getAttribute('data-nav') as Screen;
        // Always close brewing canvas first
        if (this.brewingView) this.closeBrewingCanvas();
        if (screen === 'brew') {
          this.openBrewingCanvas();
        } else if (this.currentScreen === screen) {
          this.closePanel();
        } else {
          this.openPanel(screen);
        }
      });
    });
  }

  private setupRenderer(): void {
    this.renderer = new BaseRenderer(this.canvas);
    this.renderer.setTier(this.engine.baseTier);
    this.renderer.potionCount = this.engine.inventory.length;
    this.renderer.ingredientCount = Object.values(this.engine.ingredients).reduce((a, b) => a + b, 0);

    this.renderer.onHotspotClick = (id) => {
      switch (id) {
        case 'cauldron': this.openBrewingCanvas(); break;
        case 'shelves': this.openPanel('inventory'); break;
        case 'window':
        case 'window2': this.openPanel('map'); break;
        case 'workbench': this.openPanel('upgrades'); break;
        case 'door': this.openPanel('distributors'); break;
        case 'ingredients': this.openPanel('forage'); break;
      }
    };
  }

  private openBrewingCanvas(): void {
    this.closePanel(); // Close any open panel

    // Create full-screen brewing canvas matching the base canvas size
    this.brewCanvas = document.createElement('canvas');
    // Copy dimensions directly from the working base canvas
    const baseW = this.canvas.getBoundingClientRect().width;
    const baseH = this.canvas.getBoundingClientRect().height;
    this.brewCanvas.style.cssText = `position:absolute;left:0;top:0;width:${baseW}px;height:${baseH}px;z-index:25;touch-action:none;`;
    this.canvasContainer.appendChild(this.brewCanvas);

    // Small delay to ensure the element is in the DOM and laid out
    setTimeout(() => {
      this.brewingView = new BrewingView(this.brewCanvas!, this.engine);
      this.brewingView.onClose = () => this.closeBrewingCanvas();
    }, 50);

    this.currentScreen = 'brew';
    this.updateBottomBar();
  }

  private closeBrewingCanvas(): void {
    if (this.brewingView) {
      this.brewingView.stop();
      this.brewingView = null;
    }
    if (this.brewCanvas) {
      this.brewCanvas.remove();
      this.brewCanvas = null;
    }
    this.currentScreen = 'home';
    this.updateBottomBar();
    // Refresh renderer state
    this.renderer.potionCount = this.engine.inventory.length;
    this.renderer.ingredientCount = Object.values(this.engine.ingredients).reduce((a, b) => a + b, 0);
  }

  private closePanel(): void {
    this.currentScreen = 'home';
    this.panelLayer.innerHTML = '';
    this.panelLayer.style.pointerEvents = 'none';
    this.updateBottomBar();
  }

  private openPanel(screen: Screen): void {
    this.currentScreen = screen;
    this.panelLayer.innerHTML = '';
    this.panelLayer.style.pointerEvents = 'auto';

    // Dim overlay — delay click listener to avoid catching the same touch event
    const overlay = document.createElement('div');
    overlay.className = 'panel-overlay-bg';
    const openTime = Date.now();
    overlay.addEventListener('click', () => {
      if (Date.now() - openTime < 400) return; // Ignore click from the same touch that opened the panel
      this.closePanel();
    });
    this.panelLayer.appendChild(overlay);

    // Slide-in panel
    const panel = document.createElement('div');
    panel.className = 'slide-panel';

    const header = document.createElement('div');
    header.className = 'slide-panel-header';
    header.innerHTML = `
      <span class="title">${this.getPanelTitle(screen)}</span>
      <button class="btn btn-sm btn-outline" id="close-panel">${icon('close', 16)}</button>
    `;
    panel.appendChild(header);

    const content = document.createElement('div');
    content.className = 'slide-panel-content';
    panel.appendChild(content);

    this.panelLayer.appendChild(panel);

    // Swipe to close
    this.setupSwipeToClose(panel);

    const navigate = (s: string) => {
      if (s === 'home' || s === 'map_close') this.closePanel();
      else this.openPanel(s as Screen);
    };

    let screenEl: HTMLElement;
    switch (screen) {
      case 'map':
        screenEl = renderMapView(this.engine, (locId) => {
          if (locId === 'base') this.closePanel();
          else if (locId.startsWith('dist_')) this.openPanel('distributors');
          else if (locId.startsWith('zone_')) this.openPanel('forage');
        });
        break;
      case 'base': screenEl = renderBaseView(this.engine, navigate); break;
      case 'brew': screenEl = renderBrewing(this.engine, navigate); break;
      case 'forage': screenEl = renderForaging(this.engine, navigate); break;
      case 'distributors': screenEl = renderDistributors(this.engine, navigate); break;
      case 'inventory': screenEl = renderInventory(this.engine, navigate); break;
      case 'upgrades': screenEl = renderUpgrades(this.engine, navigate); break;
      case 'dashboard': screenEl = renderDashboard(this.engine, navigate); break;
      default: screenEl = document.createElement('div');
    }

    content.appendChild(screenEl);
    header.querySelector('#close-panel')?.addEventListener('click', () => this.closePanel());
    this.updateBottomBar();
  }

  private setupSwipeToClose(panel: HTMLElement): void {
    let startX = 0;
    let startY = 0;
    let dragging = false;

    panel.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      dragging = false;
    }, { passive: true });

    panel.addEventListener('touchmove', (e) => {
      const dx = e.touches[0].clientX - startX;
      const dy = Math.abs(e.touches[0].clientY - startY);
      if (dx > 20 && dx > dy) {
        dragging = true;
        panel.style.transform = `translateX(${Math.max(0, dx - 20)}px)`;
        panel.style.transition = 'none';
      }
    }, { passive: true });

    panel.addEventListener('touchend', (e) => {
      if (!dragging) return;
      const dx = e.changedTouches[0].clientX - startX;
      panel.style.transition = 'transform 0.2s ease';
      if (dx > 100) {
        panel.style.transform = 'translateX(100%)';
        setTimeout(() => this.closePanel(), 200);
      } else {
        panel.style.transform = 'translateX(0)';
      }
    }, { passive: true });
  }

  private getPanelTitle(screen: Screen): string {
    const titles: Record<string, string> = {
      home: 'Home', map: 'World Map', base: 'Your Base',
      brew: 'Brewing Station', forage: 'Foraging',
      distributors: 'Distributors', inventory: 'Inventory',
      upgrades: 'Upgrades', dashboard: 'Dashboard',
    };
    return titles[screen] || 'Game';
  }

  private setupEventListeners(): void {
    this.engine.on((event: GameEvent) => {
      switch (event.type) {
        case 'gold_changed':
        case 'mana_changed':
        case 'xp_changed':
          this.updateTopBar();
          this.updateBottomBar();
          break;

        case 'inventory_changed':
          this.renderer.potionCount = this.engine.inventory.length;
          this.updateTopBar();
          this.updateBottomBar();
          break;

        case 'ingredients_changed':
          this.renderer.ingredientCount = Object.values(this.engine.ingredients).reduce((a, b) => a + b, 0);
          break;

        case 'brew_complete': {
          // Canvas animation
          const catColors: Record<string, string> = { potion: '#a855f7', candy: '#fb923c', prank: '#f87171', enchant: '#60a5fa' };
          const resultColor = catColors[event.result.potion.category] || '#a855f7';
          // Use ingredient colors if we have them, otherwise generate from result
          const ingColors = [resultColor, '#4ade80', '#fde047'].slice(0, 2 + Math.floor(Math.random() * 2));
          this.renderer.startBrewAnimation(ingColors, resultColor, event.result.potion.quality);
          // Sound sequence
          playPlop();
          setTimeout(() => playSizzle(1.5), 300);
          setTimeout(() => startBubbling(), 600);
          setTimeout(() => playPour(), 1500);
          setTimeout(() => {
            stopBubbling();
            if (event.result.potion.quality === 'masterwork') {
              playMasterworkFanfare();
            } else {
              playSuccessChime();
            }
          }, 3800);
          break;
        }

        case 'forage_result':
          playRustle();
          break;

        case 'distributor_sale':
          playCoin();
          showToast(`${event.potionName} sold for ${event.gold}g!`, 'gold');
          this.updateTopBar();
          this.updateBottomBar();
          break;

        case 'level_up':
          playSuccessChime();
          showToast(`Level up! You are now a ${event.rank.title}!`, 'success');
          break;

        case 'base_upgraded':
          this.renderer.setTier(event.tier.id);
          showToast(`Upgraded to ${event.tier.name}!`, 'success');
          break;

        case 'daily_login':
          if (event.isNew && event.streak > 1) {
            showToast(`Day ${event.streak} streak! +${Math.min(event.streak * 5, 50)}g bonus`, 'gold');
          }
          break;
      }
    });
  }

  private showOnboarding(): void {
    // Only show on first play
    if (this.engine.totalBrews > 0 || this.engine.discoveredRecipes.size > 0) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="text-align:center;">
        <div style="margin-bottom:12px;">${icon('wizard', 64)}</div>
        <div class="modal-title">Welcome, Apprentice!</div>
        <p class="text-sm text-dim" style="line-height:1.6; margin-bottom:16px;">
          You run a tiny potion shop in the attic of a tavern.
          <br><br>
          <strong style="color:var(--text);">Forage</strong> ingredients, <strong style="color:var(--text);">brew</strong> potions, and assign them to <strong style="color:var(--text);">distributors</strong> who sell them while you're away.
          <br><br>
          Tap objects in your room or use the buttons below.
          Earn gold and upgrade your base from a dusty attic to a grand wizard castle!
        </p>
        <button class="btn btn-primary btn-block" id="onboard-start">Let's Brew!</button>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#onboard-start')?.addEventListener('click', () => {
      overlay.remove();
      // Pulse the forage button to guide them
      const forageBtn = this.bottomBarEl.querySelector('[data-nav="forage"]');
      if (forageBtn) {
        forageBtn.classList.add('nav-btn-pulse');
        setTimeout(() => forageBtn.classList.remove('nav-btn-pulse'), 8000);
      }
    });
  }

  private startManaTimer(): void {
    this.manaTimerInterval = window.setInterval(() => {
      const manaEl = document.getElementById('top-mana');
      const barEl = document.getElementById('top-mana-bar');
      const goldEl = document.getElementById('top-gold');
      if (manaEl) manaEl.textContent = `${this.engine.mana}`;
      if (barEl) barEl.style.width = `${(this.engine.mana / this.engine.maxMana) * 100}%`;
      if (goldEl) goldEl.textContent = formatGold(this.engine.gold);
    }, 1000);
  }
}
