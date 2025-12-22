import { PLANNING_POKER_DECK, CardValue } from './index';

describe('Core Types', () => {
  describe('Planning Poker Deck', () => {
    it('should contain the standard Planning Poker cards', () => {
      const expectedCards = ['0.5', '1', '2', '3', '5', '8', '13', '21', '?', '☕'];
      expect(PLANNING_POKER_DECK).toEqual(expectedCards);
    });

    it('should have exactly 10 cards', () => {
      expect(PLANNING_POKER_DECK).toHaveLength(10);
    });

    it('should include special cards', () => {
      expect(PLANNING_POKER_DECK).toContain('?');
      expect(PLANNING_POKER_DECK).toContain('☕');
    });
  });

  describe('CardValue type', () => {
    it('should accept valid card values', () => {
      const validCard: CardValue = '5';
      expect(validCard).toBe('5');
    });

    it('should accept special card values', () => {
      const unknownCard: CardValue = '?';
      const coffeeCard: CardValue = '☕';
      expect(unknownCard).toBe('?');
      expect(coffeeCard).toBe('☕');
    });
  });
});