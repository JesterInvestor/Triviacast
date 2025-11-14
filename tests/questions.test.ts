import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchOpenTDB,
  loadLocalFarcasterQuestions,
  convertLocalToQuizQuestions,
  pickRandomQuestions,
  getFarcasterQuestions,
} from '../lib/questions';
import type { LocalQuestion, OpenTDBQuestion, QuizQuestion } from '../types/question';

// Mock fetch globally
global.fetch = vi.fn();

describe('questions library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('fetchOpenTDB', () => {
    it('should fetch questions from OpenTDB API', async () => {
      const mockResponse: OpenTDBQuestion[] = [
        {
          category: 'General Knowledge',
          type: 'multiple',
          difficulty: 'easy',
          question: 'Test question?',
          correct_answer: 'Answer 1',
          incorrect_answers: ['Answer 2', 'Answer 3', 'Answer 4'],
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response_code: 0, results: mockResponse }),
      });

      const result = await fetchOpenTDB(10, 'easy');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://opentdb.com/api.php')
      );
      expect(result).toHaveLength(1);
      expect(result[0].question).toBe('Test question?');
    });

    it('should throw error on API failure', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(fetchOpenTDB(10)).rejects.toThrow('OpenTDB API error');
    });

    it('should throw error on invalid response code', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response_code: 1, results: [] }),
      });

      await expect(fetchOpenTDB(10)).rejects.toThrow('Invalid response from OpenTDB API');
    });
  });

  describe('loadLocalFarcasterQuestions', () => {
    const mockQuestions: LocalQuestion[] = [
      {
        id: 'test_001',
        question: 'Test question 1?',
        options: ['A', 'B', 'C', 'D'],
        answer: 0,
        tags: ['farcaster', 'basics'],
      },
      {
        id: 'test_002',
        question: 'Test question 2?',
        options: ['A', 'B', 'C', 'D'],
        answer: 1,
        tags: ['farcaster', 'hard'],
      },
    ];

    it('should load local questions', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockQuestions,
      });

      const result = await loadLocalFarcasterQuestions();

      expect(global.fetch).toHaveBeenCalledWith('/data/farcaster_questions.json');
      expect(result).toEqual(mockQuestions);
    });

    it('should filter by tags', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockQuestions,
      });

      const result = await loadLocalFarcasterQuestions(['hard']);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('test_002');
    });

    it('should throw error on fetch failure', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(loadLocalFarcasterQuestions()).rejects.toThrow(
        'Failed to load Farcaster questions'
      );
    });
  });

  describe('convertLocalToQuizQuestions', () => {
    it('should convert local questions to quiz format', () => {
      const localQuestions: LocalQuestion[] = [
        {
          id: 'test_001',
          question: 'Test question?',
          options: ['A', 'B', 'C', 'D'],
          answer: 2,
          explanation: 'Test explanation',
          tags: ['farcaster', 'hard'],
        },
      ];

      const result = convertLocalToQuizQuestions(localQuestions);

      expect(result).toHaveLength(1);
      expect(result[0].question).toBe('Test question?');
      expect(result[0].correct_answer).toBe('C');
      expect(result[0].incorrect_answers).toEqual(['A', 'B', 'D']);
      expect(result[0].explanation).toBe('Test explanation');
      expect(result[0].difficulty).toBe('hard');
    });

    it('should handle questions without tags', () => {
      const localQuestions: LocalQuestion[] = [
        {
          id: 'test_001',
          question: 'Test question?',
          options: ['A', 'B', 'C', 'D'],
          answer: 0,
        },
      ];

      const result = convertLocalToQuizQuestions(localQuestions);

      expect(result[0].category).toBe('Farcaster');
      expect(result[0].difficulty).toBe('medium');
    });
  });

  describe('pickRandomQuestions', () => {
    it('should pick random questions', () => {
      const questions = [
        { id: 1, text: 'Q1' },
        { id: 2, text: 'Q2' },
        { id: 3, text: 'Q3' },
        { id: 4, text: 'Q4' },
        { id: 5, text: 'Q5' },
      ];

      const result = pickRandomQuestions(questions, 3);

      expect(result).toHaveLength(3);
      // Verify all picked questions are from original array
      result.forEach((q) => {
        expect(questions).toContainEqual(q);
      });
    });

    it('should return all questions shuffled if amount >= length', () => {
      const questions = [
        { id: 1, text: 'Q1' },
        { id: 2, text: 'Q2' },
        { id: 3, text: 'Q3' },
      ];

      const result = pickRandomQuestions(questions, 5);

      expect(result).toHaveLength(3);
      result.forEach((q) => {
        expect(questions).toContainEqual(q);
      });
    });

    it('should not have duplicates', () => {
      const questions = Array.from({ length: 20 }, (_, i) => ({ id: i, text: `Q${i}` }));

      const result = pickRandomQuestions(questions, 10);

      const ids = result.map((q) => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });
  });

  describe('getFarcasterQuestions', () => {
    it('should load, convert, and pick random Farcaster questions', async () => {
      const mockQuestions: LocalQuestion[] = [
        {
          id: 'test_001',
          question: 'Test question 1?',
          options: ['A', 'B', 'C', 'D'],
          answer: 0,
          tags: ['farcaster'],
        },
        {
          id: 'test_002',
          question: 'Test question 2?',
          options: ['A', 'B', 'C', 'D'],
          answer: 1,
          tags: ['farcaster'],
        },
        {
          id: 'test_003',
          question: 'Test question 3?',
          options: ['A', 'B', 'C', 'D'],
          answer: 2,
          tags: ['farcaster'],
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockQuestions,
      });

      const result = await getFarcasterQuestions(2);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('correct_answer');
      expect(result[0]).toHaveProperty('incorrect_answers');
    });
  });
});
