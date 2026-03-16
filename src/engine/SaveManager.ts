const SAVE_KEY = 'prank_shop_v3';

export interface SaveData {
  gold: number;
  xp: number;
  mana: number;
  maxMana: number;
  lastManaTickMs: number;
  ingredients: Record<string, number>; // id → count
  inventory: SavedPotion[];
  discoveredRecipes: string[];
  unlockedDistributors: string[];
  distributorStock: Record<string, DistributorStockSave>;
  upgrades: string[];
  baseTier: string;
  totalBrews: number;
  totalSales: number;
  totalGoldEarned: number;
  foragesRemaining: number;
  lastForageResetMs: number;
  dailyStreak: number;
  lastLoginDateStr: string; // YYYY-MM-DD
}

export interface SavedPotion {
  recipeId: string;
  quality: string;
  qualityMultiplier: number;
}

export interface DistributorStockSave {
  items: { recipeId: string; quality: string; qualityMultiplier: number; price: number }[];
  goldEarned: number;
  lastSellTickMs: number;
  itemsSold: number;
}

export function save(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // storage full — silently fail
  }
}

export function load(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SaveData;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
