export interface ForageZone {
  id: string;
  name: string;
  emoji: string;
  manaCost: number;
  /** ingredient pools: id → relative weight */
  drops: Record<string, number>;
  unlockLevel: number;
}

export const FORAGE_ZONES: Record<string, ForageZone> = {
  meadow: {
    id: 'meadow',
    name: 'Sunlit Meadow',
    emoji: '🌿',
    manaCost: 3,
    drops: {
      moonpetal: 30,
      sweetbloom: 30,
      honeyroot: 25,
      sparkweed: 15,
    },
    unlockLevel: 1,
  },
  swamp: {
    id: 'swamp',
    name: 'Foggy Swamp',
    emoji: '🐸',
    manaCost: 5,
    drops: {
      frogspit: 35,
      gloomcap: 20,
      boomberry: 25,
      nixiebloom: 15,
      firetongue: 5,
    },
    unlockLevel: 2,
  },
  caves: {
    id: 'caves',
    name: 'Crystal Caves',
    emoji: '💎',
    manaCost: 8,
    drops: {
      shadowdust: 25,
      gloomcap: 20,
      crystalthorn: 10,
      sparkweed: 20,
      fizzbane: 25,
    },
    unlockLevel: 3,
  },
  ruins: {
    id: 'ruins',
    name: 'Ancient Ruins',
    emoji: '🏛️',
    manaCost: 10,
    drops: {
      voidmoss: 10,
      shadowdust: 20,
      dragonscale: 8,
      starjelly: 15,
      firetongue: 20,
      crystalthorn: 12,
      moonpetal: 15,
    },
    unlockLevel: 5,
  },
  skyreach: {
    id: 'skyreach',
    name: 'Skyreach Peak',
    emoji: '⛰️',
    manaCost: 15,
    drops: {
      starjelly: 25,
      dragonscale: 15,
      voidmoss: 15,
      crystalthorn: 15,
      nixiebloom: 15,
      fizzbane: 15,
    },
    unlockLevel: 8,
  },
};

export function rollDrop(zone: ForageZone): string {
  const entries = Object.entries(zone.drops);
  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * totalWeight;
  for (const [id, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return id;
  }
  return entries[0][0];
}
