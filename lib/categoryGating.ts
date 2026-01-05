/**
 * Category Gating Logic
 * Gates certain quiz categories based on user's T points
 */

export interface CategoryGatingTier {
  minPoints: number;
  categories: string[];
}

// Define gating tiers
export const GATING_TIERS: CategoryGatingTier[] = [
  {
    minPoints: 20000,
    categories: [
      'Entertainment: Books',
      'Entertainment: Film',
      'Entertainment: Music',
      'Entertainment: Musicals & Theatres',
    ],
  },
  {
    minPoints: 50000,
    categories: [
      'Entertainment: Television',
      'Entertainment: Video Games',
      'Entertainment: Board Games',
      'Science & Nature',
      'Science: Computers',
      'Science: Mathematics',
      'Mythology',
      'Sports',
    ],
  },
  {
    minPoints: 100000,
    categories: [
      'Geography',
      'History',
      'Politics',
      'Art',
      'Celebrities',
      'Animals',
      'Vehicles',
      'Entertainment: Comics',
      'Science: Gadgets',
      'Entertainment: Japanese Anime & Manga',
      'Entertainment: Cartoon & Animations',
    ],
  },
];

// Categories that are always available (not gated)
export const UNGATED_CATEGORIES = [
  'General Knowledge',
  'Farcaster',
  'Base',
  'Christmas',
  'Podcasts',
];

// Cache category to points mapping for O(1) lookups
const CATEGORY_TO_POINTS_MAP = new Map<string, number>();
for (const tier of GATING_TIERS) {
  for (const category of tier.categories) {
    CATEGORY_TO_POINTS_MAP.set(category, tier.minPoints);
  }
}

/**
 * Get the minimum T points required for a category
 * @param category Category name
 * @returns Minimum points required, or 0 if ungated
 */
export function getRequiredPoints(category: string): number {
  return CATEGORY_TO_POINTS_MAP.get(category) ?? 0;
}

/**
 * Check if a user can access a category
 * @param category Category name
 * @param userPoints User's total T points
 * @returns true if user can access, false otherwise
 */
export function canAccessCategory(category: string, userPoints: number): boolean {
  const requiredPoints = getRequiredPoints(category);
  return userPoints >= requiredPoints;
}

/**
 * Get all categories that are accessible to a user
 * @param allCategories All available categories
 * @param userPoints User's total T points
 * @returns Array of accessible category names
 */
export function getAccessibleCategories(allCategories: string[], userPoints: number): string[] {
  return allCategories.filter((cat) => canAccessCategory(cat, userPoints));
}

/**
 * Check if a category is gated
 * @param category Category name
 * @returns true if gated, false otherwise
 */
export function isCategoryGated(category: string): boolean {
  return getRequiredPoints(category) > 0;
}
