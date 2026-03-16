import { PotionCategory } from './recipes';

export interface DistributorDef {
  id: string;
  name: string;
  emoji: string;
  location: string;
  description: string;
  color: string;
  unlockCost: number;
  // What they sell well / poorly
  demandMultiplier: Partial<Record<PotionCategory, number>>;
  // How many items they can carry
  baseCapacity: number;
  // How fast they sell (seconds per item at base)
  baseSellInterval: number;
  // Cut they take (0-1)
  cut: number;
}

export const DISTRIBUTORS: Record<string, DistributorDef> = {
  grix: {
    id: 'grix',
    name: 'Grix the Goblin',
    emoji: '👺',
    location: 'Market Square',
    description: 'Fast-talking goblin. Sells quick but takes a big cut.',
    color: '#4ade80',
    unlockCost: 0, // starter
    demandMultiplier: { potion: 1.0, candy: 1.2, prank: 0.8, enchant: 0.5 },
    baseCapacity: 5,
    baseSellInterval: 120, // 2 min per item
    cut: 0.25,
  },
  whisper: {
    id: 'whisper',
    name: 'Whisper the Fairy',
    emoji: '🧚',
    location: 'Academy Gardens',
    description: 'Gets premium prices from students. Slow but profitable.',
    color: '#f9a8d4',
    unlockCost: 100,
    demandMultiplier: { potion: 1.3, candy: 1.5, prank: 0.4, enchant: 1.0 },
    baseCapacity: 4,
    baseSellInterval: 300, // 5 min per item
    cut: 0.10,
  },
  skrag: {
    id: 'skrag',
    name: 'Skrag the Imp',
    emoji: '😈',
    location: 'Back Alleys',
    description: 'Shady deals in dark corners. Prank specialist.',
    color: '#f87171',
    unlockCost: 200,
    demandMultiplier: { potion: 0.6, candy: 0.5, prank: 2.0, enchant: 1.5 },
    baseCapacity: 6,
    baseSellInterval: 180, // 3 min per item
    cut: 0.20,
  },
  barnaby: {
    id: 'barnaby',
    name: 'Barnaby the Merchant',
    emoji: '🧔',
    location: 'Noble District',
    description: 'Proper gentleman. Pays top gold for quality potions.',
    color: '#fbbf24',
    unlockCost: 500,
    demandMultiplier: { potion: 1.8, candy: 0.8, prank: 0.2, enchant: 2.0 },
    baseCapacity: 3,
    baseSellInterval: 600, // 10 min per item
    cut: 0.05,
  },
  patches: {
    id: 'patches',
    name: 'Patches the Cat',
    emoji: '🐱',
    location: 'The Docks',
    description: 'A suspiciously clever cat. Sells everything at decent speed.',
    color: '#fb923c',
    unlockCost: 350,
    demandMultiplier: { potion: 1.0, candy: 1.0, prank: 1.0, enchant: 1.0 },
    baseCapacity: 8,
    baseSellInterval: 240, // 4 min per item
    cut: 0.15,
  },
};

export function getDistributor(id: string): DistributorDef | undefined {
  return DISTRIBUTORS[id];
}
