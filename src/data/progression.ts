export interface WizardRank {
  level: number;
  title: string;
  xpRequired: number; // cumulative XP to reach this rank
}

export const RANKS: WizardRank[] = [
  { level: 1, title: 'Novice', xpRequired: 0 },
  { level: 2, title: 'Apprentice', xpRequired: 50 },
  { level: 3, title: 'Journeyman', xpRequired: 150 },
  { level: 4, title: 'Adept', xpRequired: 350 },
  { level: 5, title: 'Expert', xpRequired: 700 },
  { level: 6, title: 'Master', xpRequired: 1200 },
  { level: 7, title: 'Grand Master', xpRequired: 2000 },
  { level: 8, title: 'Archmage', xpRequired: 3500 },
  { level: 9, title: 'Legendary', xpRequired: 6000 },
  { level: 10, title: 'Mythic', xpRequired: 10000 },
];

export function getRank(xp: number): WizardRank {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (xp >= r.xpRequired) rank = r;
    else break;
  }
  return rank;
}

export function getNextRank(xp: number): WizardRank | null {
  for (const r of RANKS) {
    if (xp < r.xpRequired) return r;
  }
  return null;
}

export function getXpProgress(xp: number): { current: number; needed: number; fraction: number } {
  const rank = getRank(xp);
  const next = getNextRank(xp);
  if (!next) return { current: 0, needed: 0, fraction: 1 };
  const current = xp - rank.xpRequired;
  const needed = next.xpRequired - rank.xpRequired;
  return { current, needed, fraction: current / needed };
}

// XP rewards
export const XP_BREW = 5;
export const XP_BREW_NEW_RECIPE = 25;
export const XP_FORAGE = 2;
export const XP_SALE = 3;
export const XP_QUALITY_BONUS: Record<string, number> = {
  shoddy: 0,
  common: 1,
  fine: 3,
  superior: 8,
  masterwork: 20,
};
