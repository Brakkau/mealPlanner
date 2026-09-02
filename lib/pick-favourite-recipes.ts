// ============= Types =============

export interface TitledRecipe {
  title: string;
}

export type RandomFn = () => number;

// ============= Helpers =============

export function shuffle<T>(items: T[], random: RandomFn = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const current = copy[i];
    const swapWith = copy[j];
    if (current === undefined || swapWith === undefined) continue;
    copy[i] = swapWith;
    copy[j] = current;
  }
  return copy;
}

export function partitionFavouritesByRecency<T extends TitledRecipe>(
  recipes: T[],
  recentTitles: string[]
): { preferred: T[]; fallback: T[] } {
  const recentSet = new Set(recentTitles.map((title) => title.trim().toLowerCase()));
  const preferred: T[] = [];
  const fallback: T[] = [];

  for (const recipe of recipes) {
    const title = recipe.title.trim().toLowerCase();
    if (recentSet.has(title)) {
      fallback.push(recipe);
    } else {
      preferred.push(recipe);
    }
  }

  return { preferred, fallback };
}

export function pickFavouriteRecipes<T extends TitledRecipe>(
  recipes: T[],
  count: number,
  recentTitles: string[],
  random: RandomFn = Math.random
): T[] {
  if (count <= 0 || recipes.length === 0) {
    return [];
  }

  const { preferred, fallback } = partitionFavouritesByRecency(recipes, recentTitles);
  return [...shuffle(preferred, random), ...shuffle(fallback, random)].slice(0, count);
}
