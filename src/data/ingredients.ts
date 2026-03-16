export interface Ingredient {
  id: string;
  name: string;
  tags: string[];
  color: string;
  rarity: 'common' | 'uncommon' | 'rare';
  description: string;
}

export const INGREDIENTS: Record<string, Ingredient> = {
  moonpetal: {
    id: 'moonpetal',
    name: 'Moonpetal',
    tags: ['lunar', 'healing', 'calming'],
    color: '#c4b5fd',
    rarity: 'common',
    description: 'A pale flower that blooms under moonlight.',
  },
  firetongue: {
    id: 'firetongue',
    name: 'Firetongue',
    tags: ['fire', 'energy', 'volatile'],
    color: '#f87171',
    rarity: 'common',
    description: 'A spicy root that burns to the touch.',
  },
  frogspit: {
    id: 'frogspit',
    name: 'Frogspit',
    tags: ['swamp', 'prank', 'slimy'],
    color: '#86efac',
    rarity: 'common',
    description: 'Sticky green goo from swamp frogs.',
  },
  shadowdust: {
    id: 'shadowdust',
    name: 'Shadowdust',
    tags: ['dark', 'stealth', 'volatile'],
    color: '#6b7280',
    rarity: 'uncommon',
    description: 'Fine black powder that absorbs light.',
  },
  sweetbloom: {
    id: 'sweetbloom',
    name: 'Sweetbloom',
    tags: ['sweet', 'candy', 'calming'],
    color: '#f9a8d4',
    rarity: 'common',
    description: 'Sugar-scented pink blossoms.',
  },
  sparkweed: {
    id: 'sparkweed',
    name: 'Sparkweed',
    tags: ['electric', 'energy', 'prank'],
    color: '#fde047',
    rarity: 'common',
    description: 'Crackles with static electricity.',
  },
  gloomcap: {
    id: 'gloomcap',
    name: 'Gloomcap',
    tags: ['fungus', 'dark', 'toxic'],
    color: '#7c3aed',
    rarity: 'uncommon',
    description: 'A purple mushroom from deep caves.',
  },
  starjelly: {
    id: 'starjelly',
    name: 'Starjelly',
    tags: ['cosmic', 'healing', 'sweet'],
    color: '#93c5fd',
    rarity: 'uncommon',
    description: 'Shimmering gel that fell from the sky.',
  },
  dragonscale: {
    id: 'dragonscale',
    name: 'Dragonscale',
    tags: ['fire', 'strong', 'rare'],
    color: '#ef4444',
    rarity: 'rare',
    description: 'A shimmering red scale from a young dragon.',
  },
  nixiebloom: {
    id: 'nixiebloom',
    name: 'Nixiebloom',
    tags: ['water', 'calming', 'lunar'],
    color: '#67e8f9',
    rarity: 'uncommon',
    description: 'An aquatic flower with a soothing scent.',
  },
  boomberry: {
    id: 'boomberry',
    name: 'Boomberry',
    tags: ['explosive', 'prank', 'volatile'],
    color: '#fb923c',
    rarity: 'common',
    description: 'Pops loudly when squeezed.',
  },
  honeyroot: {
    id: 'honeyroot',
    name: 'Honeyroot',
    tags: ['sweet', 'healing', 'earth'],
    color: '#d97706',
    rarity: 'common',
    description: 'A golden root that oozes sweet sap.',
  },
  voidmoss: {
    id: 'voidmoss',
    name: 'Voidmoss',
    tags: ['cosmic', 'dark', 'rare'],
    color: '#312e81',
    rarity: 'rare',
    description: 'Pitch-black moss that seems to absorb sound.',
  },
  fizzbane: {
    id: 'fizzbane',
    name: 'Fizzbane',
    tags: ['electric', 'candy', 'explosive'],
    color: '#a3e635',
    rarity: 'common',
    description: 'Fizzy crystals that pop on your tongue.',
  },
  crystalthorn: {
    id: 'crystalthorn',
    name: 'Crystalthorn',
    tags: ['ice', 'strong', 'stealth'],
    color: '#e0f2fe',
    rarity: 'rare',
    description: 'A transparent thorn that never melts.',
  },
};

export function getIngredient(id: string): Ingredient | undefined {
  return INGREDIENTS[id];
}

export function getAllIngredients(): Ingredient[] {
  return Object.values(INGREDIENTS);
}
