import { INGREDIENTS, getIngredient, type Ingredient } from '../data/ingredients';
import { findRecipe, rollQuality, getRecipe, type Recipe, type QualityTier, type PotionCategory } from '../data/recipes';
import { DISTRIBUTORS, getDistributor, type DistributorDef } from '../data/distributors';
import { UPGRADES, type UpgradeEffect } from '../data/upgrades';
import { FORAGE_ZONES, rollDrop, type ForageZone } from '../data/foraging';
import { getRank, getNextRank, getXpProgress, XP_BREW, XP_BREW_NEW_RECIPE, XP_FORAGE, XP_SALE, XP_QUALITY_BONUS, type WizardRank } from '../data/progression';
import { BASE_TIERS, getBaseTier, getNextBaseTier, type BaseTier } from '../data/base';
import { save, load, clearSave, type SaveData, type SavedPotion, type DistributorStockSave } from './SaveManager';

// ── Types ───────────────────────────────────────────────────

export interface Potion {
  recipeId: string;
  name: string;
  category: PotionCategory;
  quality: QualityTier;
  qualityMultiplier: number;
  basePrice: number;
  sellPrice: number;
}

export interface DistributorState {
  id: string;
  def: DistributorDef;
  unlocked: boolean;
  stock: { potion: Potion; price: number }[];
  goldEarned: number;
  lastSellTickMs: number;
  itemsSold: number;
}

export interface BrewResult {
  potion: Potion;
  newRecipe: boolean;
}

export type GameEvent =
  | { type: 'gold_changed'; gold: number }
  | { type: 'xp_changed'; xp: number; rank: WizardRank }
  | { type: 'mana_changed'; mana: number; maxMana: number }
  | { type: 'inventory_changed' }
  | { type: 'ingredients_changed' }
  | { type: 'brew_complete'; result: BrewResult }
  | { type: 'forage_result'; ingredientId: string; ingredientName: string; zone: string }
  | { type: 'distributor_sale'; distributorId: string; potionName: string; gold: number }
  | { type: 'distributor_changed'; distributorId: string }
  | { type: 'upgrade_purchased'; upgradeId: string }
  | { type: 'recipes_changed' }
  | { type: 'daily_login'; streak: number; isNew: boolean }
  | { type: 'level_up'; rank: WizardRank }
  | { type: 'forages_changed'; remaining: number }
  | { type: 'base_upgraded'; tier: BaseTier };

type EventListener = (event: GameEvent) => void;

// ── Constants ───────────────────────────────────────────────

const BASE_MAX_MANA = 50;
const MANA_REGEN_INTERVAL_MS = 180_000; // 1 mana per 3 min
const FORAGE_RESET_INTERVAL_MS = 15 * 60_000; // 15 min
const BASE_FORAGES = 4;
const AUTOSAVE_INTERVAL_MS = 10_000;

// ── Engine ──────────────────────────────────────────────────

export class GameEngine {
  // State
  gold = 50;
  xp = 0;
  mana = 50;
  maxMana = BASE_MAX_MANA;
  ingredients: Record<string, number> = {};
  inventory: Potion[] = [];
  discoveredRecipes = new Set<string>();
  distributors: Record<string, DistributorState> = {};
  upgrades = new Set<string>();
  baseTier: string = 'attic';
  totalBrews = 0;
  totalSales = 0;
  totalGoldEarned = 0;
  foragesRemaining = BASE_FORAGES;
  lastForageResetMs = Date.now();
  dailyStreak = 0;
  lastLoginDateStr = '';

  // Internal
  private lastManaTickMs = Date.now();
  private listeners: EventListener[] = [];
  private tickInterval: number | null = null;
  private saveInterval: number | null = null;

  // ── Init ──────────────────────────────

  constructor() {
    this.initDistributors();
    this.loadGame();
    this.processOfflineProgress();
    this.checkDailyLogin();
    this.startTicking();
  }

  private initDistributors(): void {
    for (const def of Object.values(DISTRIBUTORS)) {
      this.distributors[def.id] = {
        id: def.id,
        def,
        unlocked: def.unlockCost === 0,
        stock: [],
        goldEarned: 0,
        lastSellTickMs: Date.now(),
        itemsSold: 0,
      };
    }
  }

  // ── Event System ──────────────────────

  on(listener: EventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(event: GameEvent): void {
    for (const l of this.listeners) l(event);
  }

  // ── Tick Loop ─────────────────────────

  private startTicking(): void {
    this.tickInterval = window.setInterval(() => this.tick(), 1000);
    this.saveInterval = window.setInterval(() => this.saveGame(), AUTOSAVE_INTERVAL_MS);
  }

  destroy(): void {
    if (this.tickInterval) clearInterval(this.tickInterval);
    if (this.saveInterval) clearInterval(this.saveInterval);
    this.saveGame();
  }

  private tick(): void {
    const now = Date.now();

    // Mana regen
    const manaRegenRate = this.getManaRegenInterval();
    while (now - this.lastManaTickMs >= manaRegenRate && this.mana < this.maxMana) {
      this.mana = Math.min(this.maxMana, this.mana + 1);
      this.lastManaTickMs += manaRegenRate;
    }
    if (this.mana >= this.maxMana) {
      this.lastManaTickMs = now;
    }
    this.emit({ type: 'mana_changed', mana: this.mana, maxMana: this.maxMana });

    // Forage reset
    if (now - this.lastForageResetMs >= FORAGE_RESET_INTERVAL_MS) {
      this.foragesRemaining = this.getMaxForages();
      this.lastForageResetMs = now;
      this.emit({ type: 'forages_changed', remaining: this.foragesRemaining });
    }

    // Distributor sales
    for (const dist of Object.values(this.distributors)) {
      if (!dist.unlocked || dist.stock.length === 0) continue;
      const interval = dist.def.baseSellInterval * 1000;
      while (now - dist.lastSellTickMs >= interval && dist.stock.length > 0) {
        const sold = dist.stock.shift()!;
        const earnings = Math.round(sold.price * (1 - dist.def.cut));
        dist.goldEarned += earnings;
        dist.itemsSold++;
        dist.lastSellTickMs += interval;
        this.totalSales++;
        this.addXp(XP_SALE);
        this.emit({ type: 'distributor_sale', distributorId: dist.id, potionName: sold.potion.name, gold: earnings });
        this.emit({ type: 'distributor_changed', distributorId: dist.id });
      }
      if (dist.stock.length === 0) {
        dist.lastSellTickMs = now;
      }
    }
  }

  // ── Offline Progress ──────────────────

  private processOfflineProgress(): void {
    const now = Date.now();

    // Mana regen while offline
    const manaRegenRate = this.getManaRegenInterval();
    const manaElapsed = now - this.lastManaTickMs;
    const manaGained = Math.floor(manaElapsed / manaRegenRate);
    if (manaGained > 0) {
      this.mana = Math.min(this.maxMana, this.mana + manaGained);
      this.lastManaTickMs += manaGained * manaRegenRate;
    }

    // Forage reset while offline
    if (now - this.lastForageResetMs >= FORAGE_RESET_INTERVAL_MS) {
      this.foragesRemaining = this.getMaxForages();
      this.lastForageResetMs = now;
    }

    // Distributor sales while offline
    for (const dist of Object.values(this.distributors)) {
      if (!dist.unlocked || dist.stock.length === 0) continue;
      const interval = dist.def.baseSellInterval * 1000;
      while (now - dist.lastSellTickMs >= interval && dist.stock.length > 0) {
        const sold = dist.stock.shift()!;
        const earnings = Math.round(sold.price * (1 - dist.def.cut));
        dist.goldEarned += earnings;
        dist.itemsSold++;
        dist.lastSellTickMs += interval;
        this.totalSales++;
      }
      if (dist.stock.length === 0) {
        dist.lastSellTickMs = now;
      }
    }
  }

  // ── Daily Login ───────────────────────

  private checkDailyLogin(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (this.lastLoginDateStr === today) {
      this.emit({ type: 'daily_login', streak: this.dailyStreak, isNew: false });
      return;
    }

    // Check if yesterday
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (this.lastLoginDateStr === yesterday) {
      this.dailyStreak++;
    } else {
      this.dailyStreak = 1;
    }
    this.lastLoginDateStr = today;

    // Streak rewards
    const streakGold = Math.min(this.dailyStreak * 5, 50);
    this.gold += streakGold;
    this.totalGoldEarned += streakGold;
    this.emit({ type: 'gold_changed', gold: this.gold });
    this.emit({ type: 'daily_login', streak: this.dailyStreak, isNew: true });
    this.saveGame();
  }

  // ── Computed Values ───────────────────

  getRank(): WizardRank { return getRank(this.xp); }
  getNextRank(): WizardRank | null { return getNextRank(this.xp); }
  getXpProgress() { return getXpProgress(this.xp); }

  getMaxMana(): number {
    let max = BASE_MAX_MANA;
    for (const uid of this.upgrades) {
      const u = UPGRADES[uid];
      if (u && u.effect.type === 'mana_max') max += u.effect.amount;
    }
    return max;
  }

  private getManaRegenInterval(): number {
    let extra = 0;
    for (const uid of this.upgrades) {
      const u = UPGRADES[uid];
      if (u && u.effect.type === 'mana_regen') extra += u.effect.amount;
    }
    // Each extra point halves the interval
    return Math.max(30_000, MANA_REGEN_INTERVAL_MS / (1 + extra));
  }

  getBrewSpeedMultiplier(): number {
    let best = 1;
    for (const uid of this.upgrades) {
      const u = UPGRADES[uid];
      if (u && u.effect.type === 'brew_speed') best = Math.min(best, u.effect.multiplier);
    }
    return best;
  }

  getQualityBonus(): number {
    let bonus = 0;
    for (const uid of this.upgrades) {
      const u = UPGRADES[uid];
      if (u && u.effect.type === 'quality_bonus') bonus += u.effect.amount;
    }
    return bonus;
  }

  getMaxForages(): number {
    let max = BASE_FORAGES;
    for (const uid of this.upgrades) {
      const u = UPGRADES[uid];
      if (u && u.effect.type === 'forage_slots') max += u.effect.amount;
    }
    return max;
  }

  getDistributorCapacityBonus(): number {
    let bonus = 0;
    for (const uid of this.upgrades) {
      const u = UPGRADES[uid];
      if (u && u.effect.type === 'distributor_capacity') bonus += u.effect.amount;
    }
    return bonus;
  }

  getDistributorCapacity(dist: DistributorState): number {
    return dist.def.baseCapacity + this.getDistributorCapacityBonus();
  }

  getForageResetTimeRemaining(): number {
    return Math.max(0, FORAGE_RESET_INTERVAL_MS - (Date.now() - this.lastForageResetMs));
  }

  getManaRegenTimeRemaining(): number {
    if (this.mana >= this.maxMana) return 0;
    return Math.max(0, this.getManaRegenInterval() - (Date.now() - this.lastManaTickMs));
  }

  getDistributorNextSaleTime(dist: DistributorState): number {
    if (dist.stock.length === 0) return 0;
    return Math.max(0, dist.def.baseSellInterval * 1000 - (Date.now() - dist.lastSellTickMs));
  }

  getIngredientCount(id: string): number {
    return this.ingredients[id] || 0;
  }

  // Pending gold from distributors ready to collect
  getPendingGold(): number {
    let total = 0;
    for (const d of Object.values(this.distributors)) {
      total += d.goldEarned;
    }
    return total;
  }

  // ── Actions ───────────────────────────

  private addXp(amount: number): void {
    const oldRank = this.getRank();
    this.xp += amount;
    const newRank = this.getRank();
    this.emit({ type: 'xp_changed', xp: this.xp, rank: newRank });
    if (newRank.level > oldRank.level) {
      this.emit({ type: 'level_up', rank: newRank });
    }
  }

  spendMana(amount: number): boolean {
    if (this.mana < amount) return false;
    this.mana -= amount;
    this.emit({ type: 'mana_changed', mana: this.mana, maxMana: this.maxMana });
    return true;
  }

  addGold(amount: number): void {
    this.gold += amount;
    this.totalGoldEarned += amount;
    this.emit({ type: 'gold_changed', gold: this.gold });
  }

  spendGold(amount: number): boolean {
    if (this.gold < amount) return false;
    this.gold -= amount;
    this.emit({ type: 'gold_changed', gold: this.gold });
    return true;
  }

  addIngredient(id: string, count: number = 1): void {
    this.ingredients[id] = (this.ingredients[id] || 0) + count;
    this.emit({ type: 'ingredients_changed' });
  }

  removeIngredient(id: string, count: number = 1): boolean {
    if ((this.ingredients[id] || 0) < count) return false;
    this.ingredients[id] -= count;
    if (this.ingredients[id] <= 0) delete this.ingredients[id];
    this.emit({ type: 'ingredients_changed' });
    return true;
  }

  // ── Brewing ───────────────────────────

  getBrewableRecipe(ingredientIds: string[]): Recipe | null {
    const allTags = new Set<string>();
    for (const id of ingredientIds) {
      const ing = getIngredient(id);
      if (!ing) return null;
      ing.tags.forEach(t => allTags.add(t));
    }
    return findRecipe(Array.from(allTags));
  }

  brew(ingredientIds: string[]): BrewResult | null {
    if (ingredientIds.length < 2 || ingredientIds.length > 3) return null;

    // Check we have the ingredients
    const counts: Record<string, number> = {};
    for (const id of ingredientIds) {
      counts[id] = (counts[id] || 0) + 1;
      if (this.getIngredientCount(id) < counts[id]) return null;
    }

    // Find recipe
    const recipe = this.getBrewableRecipe(ingredientIds);
    if (!recipe) return null;

    // Mana cost: 5 base + recipe brew time / 3
    const manaCost = 5 + Math.floor(recipe.brewTime / 3);
    if (!this.spendMana(manaCost)) return null;

    // Consume ingredients
    for (const [id, count] of Object.entries(counts)) {
      this.removeIngredient(id, count);
    }

    // Quality roll
    const qualityBonus = this.getQualityBonus() + (ingredientIds.length === 3 ? 8 : 0);
    const { tier, multiplier } = rollQuality(qualityBonus);

    const potion: Potion = {
      recipeId: recipe.id,
      name: recipe.name,
      category: recipe.category,
      quality: tier,
      qualityMultiplier: multiplier,
      basePrice: recipe.basePrice,
      sellPrice: Math.round(recipe.basePrice * multiplier),
    };

    // Check new recipe
    const newRecipe = !this.discoveredRecipes.has(recipe.id);
    if (newRecipe) {
      this.discoveredRecipes.add(recipe.id);
      this.emit({ type: 'recipes_changed' });
    }

    this.inventory.push(potion);
    this.totalBrews++;
    this.addXp(XP_BREW + (newRecipe ? XP_BREW_NEW_RECIPE : 0) + (XP_QUALITY_BONUS[tier] || 0));

    const result: BrewResult = { potion, newRecipe };
    this.emit({ type: 'brew_complete', result });
    this.emit({ type: 'inventory_changed' });
    this.saveGame();
    return result;
  }

  // ── Foraging ──────────────────────────

  canForage(zoneId: string): { ok: boolean; reason?: string } {
    const zone = FORAGE_ZONES[zoneId];
    if (!zone) return { ok: false, reason: 'Invalid zone' };
    if (this.getRank().level < zone.unlockLevel) return { ok: false, reason: `Requires ${getRank(zone.unlockLevel * 100).title} rank` };
    if (this.foragesRemaining <= 0) return { ok: false, reason: 'No forages left' };
    if (this.mana < zone.manaCost) return { ok: false, reason: 'Not enough mana' };
    return { ok: true };
  }

  forage(zoneId: string): { ingredientId: string; ingredientName: string } | null {
    const check = this.canForage(zoneId);
    if (!check.ok) return null;

    const zone = FORAGE_ZONES[zoneId]!;
    if (!this.spendMana(zone.manaCost)) return null;
    this.foragesRemaining--;

    const ingredientId = rollDrop(zone);
    const ingredient = getIngredient(ingredientId);
    if (!ingredient) return null;

    this.addIngredient(ingredientId);
    this.addXp(XP_FORAGE);
    this.emit({ type: 'forages_changed', remaining: this.foragesRemaining });
    this.emit({ type: 'forage_result', ingredientId, ingredientName: ingredient.name, zone: zone.name });
    this.saveGame();
    return { ingredientId, ingredientName: ingredient.name };
  }

  // ── Distributors ──────────────────────

  unlockDistributor(id: string): boolean {
    const dist = this.distributors[id];
    if (!dist || dist.unlocked) return false;
    if (!this.spendGold(dist.def.unlockCost)) return false;
    dist.unlocked = true;
    dist.lastSellTickMs = Date.now();
    this.emit({ type: 'distributor_changed', distributorId: id });
    this.saveGame();
    return true;
  }

  assignToDistributor(distributorId: string, inventoryIndex: number): boolean {
    const dist = this.distributors[distributorId];
    if (!dist || !dist.unlocked) return false;
    if (dist.stock.length >= this.getDistributorCapacity(dist)) return false;
    if (inventoryIndex < 0 || inventoryIndex >= this.inventory.length) return false;

    const potion = this.inventory.splice(inventoryIndex, 1)[0];
    const demandMult = dist.def.demandMultiplier[potion.category] || 1;
    const price = Math.round(potion.sellPrice * demandMult);

    dist.stock.push({ potion, price });
    if (dist.stock.length === 1) {
      dist.lastSellTickMs = Date.now();
    }

    this.emit({ type: 'inventory_changed' });
    this.emit({ type: 'distributor_changed', distributorId });
    this.saveGame();
    return true;
  }

  collectDistributorGold(id: string): number {
    const dist = this.distributors[id];
    if (!dist || dist.goldEarned <= 0) return 0;
    const amount = dist.goldEarned;
    dist.goldEarned = 0;
    this.addGold(amount);
    this.emit({ type: 'distributor_changed', distributorId: id });
    this.saveGame();
    return amount;
  }

  collectAllGold(): number {
    let total = 0;
    for (const dist of Object.values(this.distributors)) {
      if (dist.goldEarned > 0) {
        total += dist.goldEarned;
        dist.goldEarned = 0;
        this.emit({ type: 'distributor_changed', distributorId: dist.id });
      }
    }
    if (total > 0) {
      this.addGold(total);
      this.saveGame();
    }
    return total;
  }

  // ── Upgrades ──────────────────────────

  canBuyUpgrade(id: string): { ok: boolean; reason?: string } {
    const upgrade = UPGRADES[id];
    if (!upgrade) return { ok: false, reason: 'Invalid upgrade' };
    if (this.upgrades.has(id)) return { ok: false, reason: 'Already owned' };
    if (upgrade.requires && !this.upgrades.has(upgrade.requires)) {
      return { ok: false, reason: `Requires ${UPGRADES[upgrade.requires]?.name}` };
    }
    if (this.gold < upgrade.cost) return { ok: false, reason: 'Not enough gold' };
    return { ok: true };
  }

  buyUpgrade(id: string): boolean {
    const check = this.canBuyUpgrade(id);
    if (!check.ok) return false;
    const upgrade = UPGRADES[id]!;
    if (!this.spendGold(upgrade.cost)) return false;
    this.upgrades.add(id);

    // Apply immediate effects
    if (upgrade.effect.type === 'mana_max') {
      this.maxMana = this.getMaxMana();
      this.emit({ type: 'mana_changed', mana: this.mana, maxMana: this.maxMana });
    }

    this.emit({ type: 'upgrade_purchased', upgradeId: id });
    this.saveGame();
    return true;
  }

  // ── Base ────────────────────────────

  getCurrentBase(): BaseTier {
    return getBaseTier(this.baseTier) || BASE_TIERS[0];
  }

  canUpgradeBase(): { ok: boolean; reason?: string; nextTier?: BaseTier } {
    const next = getNextBaseTier(this.baseTier);
    if (!next) return { ok: false, reason: 'Already max tier' };
    if (this.getRank().level < next.level) return { ok: false, reason: `Requires level ${next.level}` };
    if (this.gold < next.cost) return { ok: false, reason: 'Not enough gold' };
    return { ok: true, nextTier: next };
  }

  upgradeBase(): boolean {
    const check = this.canUpgradeBase();
    if (!check.ok || !check.nextTier) return false;
    if (!this.spendGold(check.nextTier.cost)) return false;
    this.baseTier = check.nextTier.id;
    this.emit({ type: 'base_upgraded', tier: check.nextTier });
    this.saveGame();
    return true;
  }

  // ── Save / Load ───────────────────────

  saveGame(): void {
    const data: SaveData = {
      gold: this.gold,
      xp: this.xp,
      mana: this.mana,
      maxMana: this.maxMana,
      lastManaTickMs: this.lastManaTickMs,
      ingredients: { ...this.ingredients },
      inventory: this.inventory.map(p => ({
        recipeId: p.recipeId,
        quality: p.quality,
        qualityMultiplier: p.qualityMultiplier,
      })),
      discoveredRecipes: Array.from(this.discoveredRecipes),
      unlockedDistributors: Object.values(this.distributors).filter(d => d.unlocked).map(d => d.id),
      distributorStock: {},
      upgrades: Array.from(this.upgrades),
      baseTier: this.baseTier,
      totalBrews: this.totalBrews,
      totalSales: this.totalSales,
      totalGoldEarned: this.totalGoldEarned,
      foragesRemaining: this.foragesRemaining,
      lastForageResetMs: this.lastForageResetMs,
      dailyStreak: this.dailyStreak,
      lastLoginDateStr: this.lastLoginDateStr,
    };

    for (const [id, dist] of Object.entries(this.distributors)) {
      if (!dist.unlocked) continue;
      data.distributorStock[id] = {
        items: dist.stock.map(s => ({
          recipeId: s.potion.recipeId,
          quality: s.potion.quality,
          qualityMultiplier: s.potion.qualityMultiplier,
          price: s.price,
        })),
        goldEarned: dist.goldEarned,
        lastSellTickMs: dist.lastSellTickMs,
        itemsSold: dist.itemsSold,
      };
    }

    save(data);
  }

  private loadGame(): void {
    const data = load();
    if (!data) return;

    this.gold = data.gold;
    this.xp = data.xp;
    this.mana = data.mana;
    this.lastManaTickMs = data.lastManaTickMs;
    this.discoveredRecipes = new Set(data.discoveredRecipes);
    this.upgrades = new Set(data.upgrades);
    this.maxMana = data.maxMana || this.getMaxMana();
    this.ingredients = data.ingredients || {};
    this.baseTier = data.baseTier || 'attic';
    this.totalBrews = data.totalBrews || 0;
    this.totalSales = data.totalSales || 0;
    this.totalGoldEarned = data.totalGoldEarned || 0;
    this.foragesRemaining = data.foragesRemaining ?? BASE_FORAGES;
    this.lastForageResetMs = data.lastForageResetMs || Date.now();
    this.dailyStreak = data.dailyStreak || 0;
    this.lastLoginDateStr = data.lastLoginDateStr || '';

    // Rebuild inventory
    this.inventory = [];
    for (const saved of data.inventory) {
      const recipe = getRecipe(saved.recipeId);
      if (!recipe) continue;
      this.inventory.push({
        recipeId: recipe.id,
        name: recipe.name,
        category: recipe.category,
        quality: saved.quality as QualityTier,
        qualityMultiplier: saved.qualityMultiplier,
        basePrice: recipe.basePrice,
        sellPrice: Math.round(recipe.basePrice * saved.qualityMultiplier),
      });
    }

    // Rebuild distributors
    for (const id of data.unlockedDistributors) {
      if (this.distributors[id]) this.distributors[id].unlocked = true;
    }
    for (const [id, stockData] of Object.entries(data.distributorStock || {})) {
      const dist = this.distributors[id];
      if (!dist) continue;
      dist.goldEarned = stockData.goldEarned;
      dist.lastSellTickMs = stockData.lastSellTickMs;
      dist.itemsSold = stockData.itemsSold;
      dist.stock = [];
      for (const item of stockData.items) {
        const recipe = getRecipe(item.recipeId);
        if (!recipe) continue;
        dist.stock.push({
          potion: {
            recipeId: recipe.id,
            name: recipe.name,
            category: recipe.category,
            quality: item.quality as QualityTier,
            qualityMultiplier: item.qualityMultiplier,
            basePrice: recipe.basePrice,
            sellPrice: Math.round(recipe.basePrice * item.qualityMultiplier),
          },
          price: item.price,
        });
      }
    }
  }

  resetGame(): void {
    clearSave();
    window.location.reload();
  }
}
