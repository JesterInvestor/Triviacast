import { describe, it, expect, vi } from 'vitest';
import { 
  fetchOpenTDB, 
  loadLocalFarcasterQuestions, 
  pickRandomQuestions,
  getQuestions 
} from '@/lib/questions';

describe('Question Library', () => {
  describe('loadLocalFarcasterQuestions', () => {
    it('should load Farcaster questions from JSON file', () => {
      const questions = loadLocalFarcasterQuestions();
      
      expect(questions).toBeDefined();
      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeGreaterThan(0);
      
      // Check structure of first question
      const firstQuestion = questions[0];
      expect(firstQuestion).toHaveProperty('id');
      expect(firstQuestion).toHaveProperty('category');
      expect(firstQuestion).toHaveProperty('question');
      expect(firstQuestion).toHaveProperty('correct_answer');
      expect(firstQuestion).toHaveProperty('incorrect_answers');
      expect(Array.isArray(firstQuestion.incorrect_answers)).toBe(true);
    });
  });

  describe('pickRandomQuestions', () => {
    it('should pick requested number of questions from pool', () => {
      const pool = loadLocalFarcasterQuestions();
      const amount = 10;
      const picked = pickRandomQuestions(pool, amount);
      
      expect(picked.length).toBe(amount);
    });

    it('should filter by difficulty when specified', () => {
      const pool = loadLocalFarcasterQuestions();
      const picked = pickRandomQuestions(pool, 5, 'easy');
      
      expect(picked.length).toBeGreaterThan(0);
      picked.forEach(q => {
        expect(q.difficulty.toLowerCase()).toBe('easy');
      });
    });

    it('should handle multiple difficulties', () => {
      const pool = loadLocalFarcasterQuestions();
      const picked = pickRandomQuestions(pool, 10, 'easy,medium');
      
      expect(picked.length).toBeGreaterThan(0);
      picked.forEach(q => {
        expect(['easy', 'medium']).toContain(q.difficulty.toLowerCase());
      });
    });

    it('should return all questions when amount exceeds pool size', () => {
      const pool = loadLocalFarcasterQuestions();
      const picked = pickRandomQuestions(pool, 1000);
      
      expect(picked.length).toBe(pool.length);
    });

    it('should randomize question order', () => {
      const pool = loadLocalFarcasterQuestions();
      const picked1 = pickRandomQuestions(pool, 10);
      const picked2 = pickRandomQuestions(pool, 10);
      
      // Very unlikely to get same order twice (not guaranteed to be different, but highly probable)
      const sameOrder = picked1.every((q, i) => q.id === picked2[i].id);
      // This test might occasionally fail due to randomness, but it's statistically very unlikely
      expect(sameOrder).toBe(false);
    });
  });

  describe('getQuestions', () => {
    it('should return Farcaster questions when source is farcaster', async () => {
      const questions = await getQuestions('farcaster', 10);
      
      expect(questions).toBeDefined();
      expect(questions.length).toBe(10);
      expect(questions[0]).toHaveProperty('category');
      expect(questions[0].category).toContain('Farcaster');
    });

    it('should respect amount parameter for Farcaster questions', async () => {
      const questions = await getQuestions('farcaster', 5);
      
      expect(questions.length).toBe(5);
    });

    it('should respect difficulty parameter for Farcaster questions', async () => {
      const questions = await getQuestions('farcaster', 10, 'hard');
      
      questions.forEach(q => {
        expect(q.difficulty.toLowerCase()).toBe('hard');
      });
    });
  });

  describe('fetchOpenTDB', () => {
    it('should throw error when OpenTDB API fails', async () => {
      // Mock fetch to simulate API failure
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      await expect(fetchOpenTDB(10)).rejects.toThrow('Failed to fetch questions from OpenTDB');
    });

    it('should handle invalid response format', async () => {
      // Mock fetch to return invalid data
      global.fetch = vi.fn().mockResolvedValue({
        json: async () => ({ response_code: 1 }) // Error code
      });
      
      const questions = await fetchOpenTDB(10);
      expect(questions.length).toBe(0);
    });
  });
});
