export interface BaseTier {
  id: string;
  name: string;
  description: string;
  cost: number; // gold to upgrade TO this tier
  level: number; // minimum wizard level
  brewSlots: number; // concurrent brews
  storageSlots: number; // ingredient storage capacity
  potionSlots: number; // potion inventory capacity
  features: string[];
}

export const BASE_TIERS: BaseTier[] = [
  {
    id: 'attic',
    name: 'Dusty Attic',
    description: 'A cramped attic above a tavern. A single rusty cauldron sits in the corner.',
    cost: 0,
    level: 1,
    brewSlots: 1,
    storageSlots: 30,
    potionSlots: 10,
    features: ['Basic cauldron', 'Small herb shelf'],
  },
  {
    id: 'cottage',
    name: 'Mushroom Cottage',
    description: 'A cozy cottage at the edge of town. Room for a proper workspace.',
    cost: 200,
    level: 2,
    brewSlots: 1,
    storageSlots: 60,
    potionSlots: 20,
    features: ['Copper cauldron', 'Ingredient pantry', 'Small garden'],
  },
  {
    id: 'tower',
    name: 'Wizard Tower',
    description: 'A stone tower rising above the treeline. Now we\'re talking.',
    cost: 800,
    level: 4,
    brewSlots: 2,
    storageSlots: 120,
    potionSlots: 40,
    features: ['Iron cauldron', 'Enchanted storage', 'Alchemy lab', 'Owl post'],
  },
  {
    id: 'manor',
    name: 'Arcane Manor',
    description: 'A sprawling estate with underground labs and crystal greenhouses.',
    cost: 2500,
    level: 6,
    brewSlots: 3,
    storageSlots: 200,
    potionSlots: 60,
    features: ['Enchanted cauldron', 'Crystal greenhouse', 'Underground vault', 'Distributor lounge'],
  },
  {
    id: 'castle',
    name: 'Grand Wizard Castle',
    description: 'A towering fortress of magic. Spires pierce the clouds. This is your domain.',
    cost: 8000,
    level: 8,
    brewSlots: 4,
    storageSlots: 500,
    potionSlots: 100,
    features: ['Mythic cauldron', 'Potion vault', 'Dragon roost', 'Enchanted gardens', 'Grand library', 'Portal chamber'],
  },
];

export function getBaseTier(id: string): BaseTier | undefined {
  return BASE_TIERS.find(t => t.id === id);
}

export function getNextBaseTier(currentId: string): BaseTier | undefined {
  const idx = BASE_TIERS.findIndex(t => t.id === currentId);
  if (idx < 0 || idx >= BASE_TIERS.length - 1) return undefined;
  return BASE_TIERS[idx + 1];
}
