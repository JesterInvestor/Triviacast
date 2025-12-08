import { describe, it, expect } from 'vitest';
import { 
  getRequiredPoints,
  canAccessCategory,
  isCategoryGated,
  getAccessibleCategories,
  UNGATED_CATEGORIES,
  GATING_TIERS
} from '@/lib/categoryGating';

describe('Category Gating', () => {
  describe('getRequiredPoints', () => {
    it('should return 0 for ungated categories', () => {
      expect(getRequiredPoints('General Knowledge')).toBe(0);
      expect(getRequiredPoints('Farcaster')).toBe(0);
      expect(getRequiredPoints('Base')).toBe(0);
      expect(getRequiredPoints('Christmas')).toBe(0);
    });

    it('should return 20000 for tier 1 categories', () => {
      expect(getRequiredPoints('Entertainment: Books')).toBe(20000);
      expect(getRequiredPoints('Entertainment: Film')).toBe(20000);
      expect(getRequiredPoints('Entertainment: Music')).toBe(20000);
      expect(getRequiredPoints('Entertainment: Musicals & Theatres')).toBe(20000);
    });

    it('should return 50000 for tier 2 categories', () => {
      expect(getRequiredPoints('Entertainment: Television')).toBe(50000);
      expect(getRequiredPoints('Entertainment: Video Games')).toBe(50000);
      expect(getRequiredPoints('Entertainment: Board Games')).toBe(50000);
      expect(getRequiredPoints('Science & Nature')).toBe(50000);
      expect(getRequiredPoints('Science: Computers')).toBe(50000);
      expect(getRequiredPoints('Science: Mathematics')).toBe(50000);
      expect(getRequiredPoints('Mythology')).toBe(50000);
      expect(getRequiredPoints('Sports')).toBe(50000);
    });

    it('should return 100000 for tier 3 categories', () => {
      expect(getRequiredPoints('Geography')).toBe(100000);
      expect(getRequiredPoints('History')).toBe(100000);
      expect(getRequiredPoints('Politics')).toBe(100000);
      expect(getRequiredPoints('Art')).toBe(100000);
      expect(getRequiredPoints('Celebrities')).toBe(100000);
      expect(getRequiredPoints('Animals')).toBe(100000);
      expect(getRequiredPoints('Vehicles')).toBe(100000);
      expect(getRequiredPoints('Entertainment: Comics')).toBe(100000);
      expect(getRequiredPoints('Science: Gadgets')).toBe(100000);
      expect(getRequiredPoints('Entertainment: Japanese Anime & Manga')).toBe(100000);
      expect(getRequiredPoints('Entertainment: Cartoon & Animations')).toBe(100000);
    });

    it('should return 0 for unknown categories', () => {
      expect(getRequiredPoints('Unknown Category')).toBe(0);
    });
  });

  describe('canAccessCategory', () => {
    it('should allow access to ungated categories with any points', () => {
      expect(canAccessCategory('General Knowledge', 0)).toBe(true);
      expect(canAccessCategory('Farcaster', 0)).toBe(true);
      expect(canAccessCategory('Base', 100)).toBe(true);
      expect(canAccessCategory('Christmas', 5000)).toBe(true);
    });

    it('should deny access to tier 1 categories with insufficient points', () => {
      expect(canAccessCategory('Entertainment: Books', 0)).toBe(false);
      expect(canAccessCategory('Entertainment: Film', 10000)).toBe(false);
      expect(canAccessCategory('Entertainment: Music', 19999)).toBe(false);
    });

    it('should allow access to tier 1 categories with sufficient points', () => {
      expect(canAccessCategory('Entertainment: Books', 20000)).toBe(true);
      expect(canAccessCategory('Entertainment: Film', 25000)).toBe(true);
      expect(canAccessCategory('Entertainment: Music', 100000)).toBe(true);
    });

    it('should deny access to tier 2 categories with insufficient points', () => {
      expect(canAccessCategory('Entertainment: Television', 0)).toBe(false);
      expect(canAccessCategory('Science: Computers', 20000)).toBe(false);
      expect(canAccessCategory('Sports', 49999)).toBe(false);
    });

    it('should allow access to tier 2 categories with sufficient points', () => {
      expect(canAccessCategory('Entertainment: Television', 50000)).toBe(true);
      expect(canAccessCategory('Science: Computers', 75000)).toBe(true);
      expect(canAccessCategory('Sports', 100000)).toBe(true);
    });

    it('should deny access to tier 3 categories with insufficient points', () => {
      expect(canAccessCategory('Geography', 0)).toBe(false);
      expect(canAccessCategory('History', 50000)).toBe(false);
      expect(canAccessCategory('Art', 99999)).toBe(false);
    });

    it('should allow access to tier 3 categories with sufficient points', () => {
      expect(canAccessCategory('Geography', 100000)).toBe(true);
      expect(canAccessCategory('History', 150000)).toBe(true);
      expect(canAccessCategory('Art', 1000000)).toBe(true);
    });
  });

  describe('isCategoryGated', () => {
    it('should return false for ungated categories', () => {
      expect(isCategoryGated('General Knowledge')).toBe(false);
      expect(isCategoryGated('Farcaster')).toBe(false);
      expect(isCategoryGated('Base')).toBe(false);
      expect(isCategoryGated('Christmas')).toBe(false);
    });

    it('should return true for gated categories', () => {
      expect(isCategoryGated('Entertainment: Books')).toBe(true);
      expect(isCategoryGated('Entertainment: Television')).toBe(true);
      expect(isCategoryGated('Geography')).toBe(true);
    });
  });

  describe('getAccessibleCategories', () => {
    const allCategories = [
      'General Knowledge',
      'Farcaster',
      'Base',
      'Christmas',
      'Entertainment: Books',
      'Entertainment: Film',
      'Entertainment: Television',
      'Geography',
      'History',
    ];

    it('should return only ungated categories with 0 points', () => {
      const accessible = getAccessibleCategories(allCategories, 0);
      expect(accessible).toEqual([
        'General Knowledge',
        'Farcaster',
        'Base',
        'Christmas',
      ]);
    });

    it('should return ungated + tier 1 categories with 20000 points', () => {
      const accessible = getAccessibleCategories(allCategories, 20000);
      expect(accessible).toContain('General Knowledge');
      expect(accessible).toContain('Farcaster');
      expect(accessible).toContain('Base');
      expect(accessible).toContain('Christmas');
      expect(accessible).toContain('Entertainment: Books');
      expect(accessible).toContain('Entertainment: Film');
      expect(accessible).not.toContain('Entertainment: Television');
      expect(accessible).not.toContain('Geography');
    });

    it('should return ungated + tier 1 + tier 2 categories with 50000 points', () => {
      const accessible = getAccessibleCategories(allCategories, 50000);
      expect(accessible).toContain('General Knowledge');
      expect(accessible).toContain('Entertainment: Books');
      expect(accessible).toContain('Entertainment: Television');
      expect(accessible).not.toContain('Geography');
    });

    it('should return all categories with 100000+ points', () => {
      const accessible = getAccessibleCategories(allCategories, 100000);
      expect(accessible.length).toBe(allCategories.length);
      expect(accessible).toEqual(allCategories);
    });
  });

  describe('GATING_TIERS structure', () => {
    it('should have three tiers', () => {
      expect(GATING_TIERS.length).toBe(3);
    });

    it('should have correct point requirements', () => {
      expect(GATING_TIERS[0].minPoints).toBe(20000);
      expect(GATING_TIERS[1].minPoints).toBe(50000);
      expect(GATING_TIERS[2].minPoints).toBe(100000);
    });

    it('should have 4 categories in tier 1', () => {
      expect(GATING_TIERS[0].categories.length).toBe(4);
    });

    it('should have 8 categories in tier 2', () => {
      expect(GATING_TIERS[1].categories.length).toBe(8);
    });

    it('should have 11 categories in tier 3', () => {
      expect(GATING_TIERS[2].categories.length).toBe(11);
    });
  });

  describe('UNGATED_CATEGORIES', () => {
    it('should contain exactly 4 categories', () => {
      expect(UNGATED_CATEGORIES.length).toBe(4);
    });

    it('should contain the expected categories', () => {
      expect(UNGATED_CATEGORIES).toContain('General Knowledge');
      expect(UNGATED_CATEGORIES).toContain('Farcaster');
      expect(UNGATED_CATEGORIES).toContain('Base');
      expect(UNGATED_CATEGORIES).toContain('Christmas');
    });
  });
});
