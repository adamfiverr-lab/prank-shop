export interface UpgradeDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  cost: number;
  requires?: string; // prerequisite upgrade id
  effect: UpgradeEffect;
}

export type UpgradeEffect =
  | { type: 'mana_max'; amount: number }
  | { type: 'mana_regen'; amount: number } // extra mana per tick
  | { type: 'brew_speed'; multiplier: number } // brew time multiplier (lower = faster)
  | { type: 'quality_bonus'; amount: number } // added to quality roll
  | { type: 'shelf_slots'; amount: number } // extra shelf space
  | { type: 'forage_slots'; amount: number } // extra forages per cycle
  | { type: 'distributor_capacity'; amount: number }; // +capacity to all distributors

export const UPGRADES: Record<string, UpgradeDef> = {
  // ── Cauldron tier ───────────────────
  copper_cauldron: {
    id: 'copper_cauldron',
    name: 'Copper Cauldron',
    emoji: '🪣',
    description: 'Better cauldron. Brews 20% faster.',
    cost: 80,
    effect: { type: 'brew_speed', multiplier: 0.8 },
  },
  iron_cauldron: {
    id: 'iron_cauldron',
    name: 'Iron Cauldron',
    emoji: '⚙️',
    description: 'Sturdy iron. Brews 40% faster.',
    cost: 250,
    requires: 'copper_cauldron',
    effect: { type: 'brew_speed', multiplier: 0.6 },
  },
  enchanted_cauldron: {
    id: 'enchanted_cauldron',
    name: 'Enchanted Cauldron',
    emoji: '✨',
    description: 'Magical cauldron. Brews 60% faster and +5 quality.',
    cost: 800,
    requires: 'iron_cauldron',
    effect: { type: 'brew_speed', multiplier: 0.4 },
  },

  // ── Quality ─────────────────────────
  recipe_book: {
    id: 'recipe_book',
    name: 'Apprentice Recipe Book',
    emoji: '📖',
    description: '+5 to quality rolls when brewing.',
    cost: 60,
    effect: { type: 'quality_bonus', amount: 5 },
  },
  master_recipes: {
    id: 'master_recipes',
    name: 'Master Recipe Tome',
    emoji: '📚',
    description: '+10 to quality rolls.',
    cost: 300,
    requires: 'recipe_book',
    effect: { type: 'quality_bonus', amount: 10 },
  },

  // ── Mana ────────────────────────────
  mana_crystal: {
    id: 'mana_crystal',
    name: 'Mana Crystal',
    emoji: '💎',
    description: '+20 max mana.',
    cost: 100,
    effect: { type: 'mana_max', amount: 20 },
  },
  mana_fountain: {
    id: 'mana_fountain',
    name: 'Mana Fountain',
    emoji: '⛲',
    description: '+50 max mana and faster regen.',
    cost: 400,
    requires: 'mana_crystal',
    effect: { type: 'mana_max', amount: 50 },
  },
  mana_well: {
    id: 'mana_well',
    name: 'Deep Mana Well',
    emoji: '🕳️',
    description: 'Double mana regeneration speed.',
    cost: 600,
    requires: 'mana_fountain',
    effect: { type: 'mana_regen', amount: 1 },
  },

  // ── Shop ────────────────────────────
  extra_shelves: {
    id: 'extra_shelves',
    name: 'Extra Shelves',
    emoji: '🗄️',
    description: '+4 shelf slots for your shop.',
    cost: 120,
    effect: { type: 'shelf_slots', amount: 4 },
  },
  big_shelves: {
    id: 'big_shelves',
    name: 'Grand Display',
    emoji: '🏪',
    description: '+6 more shelf slots.',
    cost: 400,
    requires: 'extra_shelves',
    effect: { type: 'shelf_slots', amount: 6 },
  },

  // ── Foraging ────────────────────────
  herbalist_bag: {
    id: 'herbalist_bag',
    name: "Herbalist's Bag",
    emoji: '🎒',
    description: '+2 foraging attempts per cycle.',
    cost: 80,
    effect: { type: 'forage_slots', amount: 2 },
  },
  deep_pockets: {
    id: 'deep_pockets',
    name: 'Deep Pockets',
    emoji: '🧳',
    description: '+3 more foraging attempts.',
    cost: 250,
    requires: 'herbalist_bag',
    effect: { type: 'forage_slots', amount: 3 },
  },

  // ── Distributors ────────────────────
  bigger_carts: {
    id: 'bigger_carts',
    name: 'Bigger Carts',
    emoji: '🛒',
    description: 'All distributors carry +3 items.',
    cost: 200,
    effect: { type: 'distributor_capacity', amount: 3 },
  },
  enchanted_carts: {
    id: 'enchanted_carts',
    name: 'Enchanted Carts',
    emoji: '🪄',
    description: 'All distributors carry +5 more items.',
    cost: 500,
    requires: 'bigger_carts',
    effect: { type: 'distributor_capacity', amount: 5 },
  },
};
