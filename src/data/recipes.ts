export type PotionCategory = 'potion' | 'candy' | 'prank' | 'enchant';
export type QualityTier = 'shoddy' | 'common' | 'fine' | 'superior' | 'masterwork';

export interface Recipe {
  id: string;
  name: string;
  tagCombo: [string, string]; // two tags needed
  category: PotionCategory;
  basePrice: number;
  description: string;
  effect: string;
  brewTime: number; // seconds to brew
}

export const RECIPES: Record<string, Recipe> = {
  // ── Potions ──────────────────────────
  healing_draught: {
    id: 'healing_draught',
    name: 'Healing Draught',
    tagCombo: ['healing', 'calming'],
    category: 'potion',
    basePrice: 15,
    description: 'A soothing purple elixir that mends minor wounds.',
    effect: 'Restores health',
    brewTime: 8,
  },
  fire_tonic: {
    id: 'fire_tonic',
    name: 'Fire Tonic',
    tagCombo: ['fire', 'energy'],
    category: 'potion',
    basePrice: 20,
    description: 'A blazing red potion that fills you with vigor.',
    effect: 'Boosts energy',
    brewTime: 10,
  },
  shadow_veil: {
    id: 'shadow_veil',
    name: 'Shadow Veil',
    tagCombo: ['dark', 'stealth'],
    category: 'potion',
    basePrice: 35,
    description: 'Drinking this makes you blend into shadows.',
    effect: 'Grants stealth',
    brewTime: 15,
  },
  starlight_elixir: {
    id: 'starlight_elixir',
    name: 'Starlight Elixir',
    tagCombo: ['cosmic', 'healing'],
    category: 'potion',
    basePrice: 45,
    description: 'A shimmering potion that heals body and mind.',
    effect: 'Full restoration',
    brewTime: 20,
  },
  berserker_brew: {
    id: 'berserker_brew',
    name: "Berserker's Brew",
    tagCombo: ['fire', 'strong'],
    category: 'potion',
    basePrice: 40,
    description: 'Makes you dangerously strong for a short time.',
    effect: 'Strength boost',
    brewTime: 18,
  },
  frozen_fortitude: {
    id: 'frozen_fortitude',
    name: 'Frozen Fortitude',
    tagCombo: ['ice', 'strong'],
    category: 'potion',
    basePrice: 55,
    description: 'An icy draught that hardens your resolve.',
    effect: 'Defense boost',
    brewTime: 22,
  },
  moonwater: {
    id: 'moonwater',
    name: 'Moonwater',
    tagCombo: ['lunar', 'water'],
    category: 'potion',
    basePrice: 30,
    description: 'Glowing liquid that calms the soul.',
    effect: 'Calms and heals',
    brewTime: 12,
  },
  void_draught: {
    id: 'void_draught',
    name: 'Void Draught',
    tagCombo: ['cosmic', 'dark'],
    category: 'potion',
    basePrice: 65,
    description: 'A pitch-black potion. Dangerous and powerful.',
    effect: 'Unknown power',
    brewTime: 30,
  },

  // ── Candy ────────────────────────────
  fizz_drops: {
    id: 'fizz_drops',
    name: 'Fizz Drops',
    tagCombo: ['sweet', 'electric'],
    category: 'candy',
    basePrice: 8,
    description: 'Popping candy that sparks on your tongue.',
    effect: 'Tasty and tingly',
    brewTime: 5,
  },
  honey_chews: {
    id: 'honey_chews',
    name: 'Honey Chews',
    tagCombo: ['sweet', 'earth'],
    category: 'candy',
    basePrice: 6,
    description: 'Sticky golden chews that taste like sunshine.',
    effect: 'Sweet treat',
    brewTime: 4,
  },
  starburst_gum: {
    id: 'starburst_gum',
    name: 'Starburst Gum',
    tagCombo: ['cosmic', 'candy'],
    category: 'candy',
    basePrice: 12,
    description: 'Gum that makes your breath sparkle.',
    effect: 'Sparkling breath',
    brewTime: 6,
  },
  moonbeam_taffy: {
    id: 'moonbeam_taffy',
    name: 'Moonbeam Taffy',
    tagCombo: ['lunar', 'sweet'],
    category: 'candy',
    basePrice: 10,
    description: 'Silver taffy that glows faintly in the dark.',
    effect: 'Glowing snack',
    brewTime: 6,
  },
  dragonfire_jawbreaker: {
    id: 'dragonfire_jawbreaker',
    name: 'Dragonfire Jawbreaker',
    tagCombo: ['fire', 'candy'],
    category: 'candy',
    basePrice: 14,
    description: 'Gets hotter the longer you suck on it.',
    effect: 'Extreme heat',
    brewTime: 8,
  },

  // ── Pranks ───────────────────────────
  stink_bomb: {
    id: 'stink_bomb',
    name: 'Stink Bomb',
    tagCombo: ['slimy', 'volatile'],
    category: 'prank',
    basePrice: 18,
    description: 'Produces an absolutely horrendous smell.',
    effect: 'Area denial',
    brewTime: 8,
  },
  frog_curse: {
    id: 'frog_curse',
    name: 'Frog Curse Potion',
    tagCombo: ['swamp', 'prank'],
    category: 'prank',
    basePrice: 25,
    description: 'Turns the drinker into a frog for 10 minutes.',
    effect: 'Transformation',
    brewTime: 12,
  },
  boom_flask: {
    id: 'boom_flask',
    name: 'Boom Flask',
    tagCombo: ['explosive', 'volatile'],
    category: 'prank',
    basePrice: 22,
    description: 'Explodes with a loud bang and confetti.',
    effect: 'Loud surprise',
    brewTime: 10,
  },
  colour_chaos: {
    id: 'colour_chaos',
    name: 'Colour Chaos Splash',
    tagCombo: ['electric', 'prank'],
    category: 'prank',
    basePrice: 16,
    description: 'Splashes the target in random neon colours.',
    effect: 'Visual chaos',
    brewTime: 7,
  },
  shadow_scare: {
    id: 'shadow_scare',
    name: 'Shadow Scare',
    tagCombo: ['dark', 'volatile'],
    category: 'prank',
    basePrice: 30,
    description: 'Summons fake shadow monsters that chase the target.',
    effect: 'Terror prank',
    brewTime: 15,
  },

  // ── Enchantments ─────────────────────
  ward_charm: {
    id: 'ward_charm',
    name: 'Ward Charm',
    tagCombo: ['calming', 'strong'],
    category: 'enchant',
    basePrice: 50,
    description: 'A charm that protects your shop from pranks.',
    effect: 'Prank protection',
    brewTime: 25,
  },
  luck_enchant: {
    id: 'luck_enchant',
    name: 'Lucky Dust',
    tagCombo: ['cosmic', 'sweet'],
    category: 'enchant',
    basePrice: 40,
    description: 'Sprinkle on your cauldron for luckier brews.',
    effect: 'Quality boost',
    brewTime: 20,
  },
  aroma_enchant: {
    id: 'aroma_enchant',
    name: 'Alluring Aroma',
    tagCombo: ['sweet', 'calming'],
    category: 'enchant',
    basePrice: 35,
    description: 'Attracts more customers to your shop.',
    effect: 'Customer magnet',
    brewTime: 18,
  },
};

export function findRecipe(tags: string[]): Recipe | null {
  const tagSet = new Set(tags);
  let best: Recipe | null = null;
  for (const recipe of Object.values(RECIPES)) {
    if (tagSet.has(recipe.tagCombo[0]) && tagSet.has(recipe.tagCombo[1])) {
      if (!best || recipe.basePrice > best.basePrice) {
        best = recipe;
      }
    }
  }
  return best;
}

export function getRecipe(id: string): Recipe | undefined {
  return RECIPES[id];
}

export const QUALITY_TIERS: { tier: QualityTier; label: string; multiplier: number; minRoll: number }[] = [
  { tier: 'shoddy', label: 'Shoddy', multiplier: 0.5, minRoll: 0 },
  { tier: 'common', label: 'Common', multiplier: 1.0, minRoll: 20 },
  { tier: 'fine', label: 'Fine', multiplier: 1.5, minRoll: 55 },
  { tier: 'superior', label: 'Superior', multiplier: 2.0, minRoll: 80 },
  { tier: 'masterwork', label: 'Masterwork', multiplier: 3.0, minRoll: 97 },
];

export function rollQuality(skillBonus: number = 0): { tier: QualityTier; multiplier: number } {
  const roll = Math.min(100, Math.random() * 100 + skillBonus);
  let result = QUALITY_TIERS[0];
  for (const qt of QUALITY_TIERS) {
    if (roll >= qt.minRoll) result = qt;
  }
  return { tier: result.tier as QualityTier, multiplier: result.multiplier };
}
