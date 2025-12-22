import { 
  calculateEstimationResult, 
  getCardDistribution, 
  hasSignificantVariance,
  getVarianceAnalysis,
  getEstimationPatterns
} from './statistics';
import { db } from './in-memory-db';
import { Room, Player, EstimationRound } from '../types';

describe('Statistics Module', () => {
  let testRoom: Room;
  let testPlayer1: Player;
  let testPlayer2: Player;
  let testPlayer3: Player;

  beforeEach(() => {
    // Clear database before each test
    db.clear();
    
    // Create test room and players
    testRoom = {
      id: 'test-room-1',
      name: 'Test Room',
      createdAt: new Date(),
      players: []
    };
    
    testPlayer1 = {
      id: 'player-1',
      name: 'Alice',
      isConnected: true,
      joinedAt: new Date()
    };
    
    testPlayer2 = {
      id: 'player-2',
      name: 'Bob',
      isConnected: true,
      joinedAt: new Date()
    };

    testPlayer3 = {
      id: 'player-3',
      name: 'Charlie',
      isConnected: true,
      joinedAt: new Date()
    };
    
    // Set up test room with players
    db.createRoom(testRoom);
    db.addPlayerToRoom(testRoom.id, testPlayer1);
    db.addPlayerToRoom(testRoom.id, testPlayer2);
    db.addPlayerToRoom(testRoom.id, testPlayer3);
  });

  describe('calculateEstimationResult', () => {
    it('should return null for non-existent room', () => {
      const result = calculateEstimationResult('non-existent');
      expect(result).toBeNull();
    });

    it('should return null for room without current round', () => {
      const result = calculateEstimationResult(testRoom.id);
      expect(result).toBeNull();
    });

    it('should return null for unrevealed round', () => {
      const round: EstimationRound = {
        cards: new Map([
          [testPlayer1.id, '5'],
          [testPlayer2.id, '8']
        ]),
        isRevealed: false,
        startedAt: new Date()
      };
      
      db.setCurrentRound(testRoom.id, round);
      
      const result = calculateEstimationResult(testRoom.id);
      expect(result).toBeNull();
    });

    it('should calculate statistics for revealed cards', () => {
      const round: EstimationRound = {
        cards: new Map([
          [testPlayer1.id, '5'],
          [testPlayer2.id, '8'],
          [testPlayer3.id, '3']
        ]),
        isRevealed: true,
        startedAt: new Date()
      };
      
      db.setCurrentRound(testRoom.id, round);
      
      const result = calculateEstimationResult(testRoom.id);
      
      expect(result).toBeTruthy();
      expect(result!.cards).toHaveLength(3);
      expect(result!.statistics.average).toBe(5.33); // (5+8+3)/3 = 5.33
      expect(result!.statistics.median).toBe('5');
      expect(result!.statistics.range).toEqual(['3', '5', '8']);
      expect(result!.statistics.hasVariance).toBe(true); // range > 2
    });

    it('should handle non-numeric cards', () => {
      const round: EstimationRound = {
        cards: new Map([
          [testPlayer1.id, '?'],
          [testPlayer2.id, '☕'],
          [testPlayer3.id, '5']
        ]),
        isRevealed: true,
        startedAt: new Date()
      };
      
      db.setCurrentRound(testRoom.id, round);
      
      const result = calculateEstimationResult(testRoom.id);
      
      expect(result).toBeTruthy();
      expect(result!.statistics.average).toBe(5); // Only numeric card
      expect(result!.statistics.median).toBe('5'); // Only numeric card
      expect(result!.statistics.range).toEqual(['5', '?', '☕']);
      expect(result!.statistics.hasVariance).toBe(false); // Only one numeric card
    });

    it('should handle all non-numeric cards', () => {
      const round: EstimationRound = {
        cards: new Map([
          [testPlayer1.id, '?'],
          [testPlayer2.id, '☕']
        ]),
        isRevealed: true,
        startedAt: new Date()
      };
      
      db.setCurrentRound(testRoom.id, round);
      
      const result = calculateEstimationResult(testRoom.id);
      
      expect(result).toBeTruthy();
      expect(result!.statistics.average).toBe(0);
      expect(result!.statistics.median).toBe('?'); // First non-numeric card
      expect(result!.statistics.range).toEqual(['?', '☕']);
      expect(result!.statistics.hasVariance).toBe(false);
    });
  });

  describe('hasSignificantVariance', () => {
    it('should return false for less than 2 numeric cards', () => {
      expect(hasSignificantVariance(['5'])).toBe(false);
      expect(hasSignificantVariance(['?', '☕'])).toBe(false);
      expect(hasSignificantVariance(['5', '?'])).toBe(false);
    });

    it('should detect variance based on range', () => {
      expect(hasSignificantVariance(['1', '5'])).toBe(true); // range = 4 > 2
      expect(hasSignificantVariance(['2', '3'])).toBe(false); // range = 1 <= 2
    });

    it('should detect variance based on ratio', () => {
      expect(hasSignificantVariance(['1', '3'])).toBe(true); // ratio = 3 > 2
      expect(hasSignificantVariance(['2', '3'])).toBe(false); // ratio = 1.5 <= 2
    });
  });

  describe('getVarianceAnalysis', () => {
    it('should return null for non-existent room', () => {
      const result = getVarianceAnalysis('non-existent');
      expect(result).toBeNull();
    });

    it('should return null for unrevealed round', () => {
      const round: EstimationRound = {
        cards: new Map([
          [testPlayer1.id, '5'],
          [testPlayer2.id, '8']
        ]),
        isRevealed: false,
        startedAt: new Date()
      };
      
      db.setCurrentRound(testRoom.id, round);
      
      const result = getVarianceAnalysis(testRoom.id);
      expect(result).toBeNull();
    });

    it('should detect no variance for similar values', () => {
      const round: EstimationRound = {
        cards: new Map([
          [testPlayer1.id, '5'],
          [testPlayer2.id, '5'],
          [testPlayer3.id, '3']
        ]),
        isRevealed: true,
        startedAt: new Date()
      };
      
      db.setCurrentRound(testRoom.id, round);
      
      const result = getVarianceAnalysis(testRoom.id);
      
      expect(result).toBeTruthy();
      expect(result!.hasVariance).toBe(false);
      expect(result!.varianceLevel).toBe('none');
      expect(result!.discussionPrompt).toBe('');
      expect(result!.highlightedCards).toEqual([]);
    });

    it('should detect moderate variance', () => {
      const round: EstimationRound = {
        cards: new Map([
          [testPlayer1.id, '2'],
          [testPlayer2.id, '8'],
          [testPlayer3.id, '5']
        ]),
        isRevealed: true,
        startedAt: new Date()
      };
      
      db.setCurrentRound(testRoom.id, round);
      
      const result = getVarianceAnalysis(testRoom.id);
      
      expect(result).toBeTruthy();
      expect(result!.hasVariance).toBe(true);
      expect(result!.varianceLevel).toBe('moderate');
      expect(result!.discussionPrompt).toBe('Moderate variance detected. Team discussion may help reach consensus.');
      expect(result!.highlightedCards).toEqual(['2', '8']); // min and max values
    });

    it('should detect high variance', () => {
      const round: EstimationRound = {
        cards: new Map([
          [testPlayer1.id, '1'],
          [testPlayer2.id, '21'],
          [testPlayer3.id, '5']
        ]),
        isRevealed: true,
        startedAt: new Date()
      };
      
      db.setCurrentRound(testRoom.id, round);
      
      const result = getVarianceAnalysis(testRoom.id);
      
      expect(result).toBeTruthy();
      expect(result!.hasVariance).toBe(true);
      expect(result!.varianceLevel).toBe('high');
      expect(result!.discussionPrompt).toBe('High variance detected! Consider discussing the story requirements and complexity.');
      expect(result!.highlightedCards).toEqual(['1', '21']); // min and max values
    });
  });

  describe('getEstimationPatterns', () => {
    it('should return null for non-existent room', () => {
      const result = getEstimationPatterns('non-existent');
      expect(result).toBeNull();
    });

    it('should detect consensus when all cards are the same', () => {
      const round: EstimationRound = {
        cards: new Map([
          [testPlayer1.id, '5'],
          [testPlayer2.id, '5'],
          [testPlayer3.id, '5']
        ]),
        isRevealed: true,
        startedAt: new Date()
      };
      
      db.setCurrentRound(testRoom.id, round);
      
      const result = getEstimationPatterns(testRoom.id);
      
      expect(result).toBeTruthy();
      expect(result!.consensus).toBe(true);
      expect(result!.majorityCard).toBeNull();
      expect(result!.outliers).toEqual([]);
      expect(result!.colorCoding).toEqual({ '5': 'consensus' });
    });

    it('should detect majority card', () => {
      const round: EstimationRound = {
        cards: new Map([
          [testPlayer1.id, '5'],
          [testPlayer2.id, '3']
        ]),
        isRevealed: true,
        startedAt: new Date()
      };
      
      db.setCurrentRound(testRoom.id, round);
      
      const result = getEstimationPatterns(testRoom.id);
      
      expect(result).toBeTruthy();
      expect(result!.consensus).toBe(false);
      expect(result!.majorityCard).toBeNull(); // No majority with 2 players
      expect(result!.outliers).toEqual([]); // No outliers with only 2 players
      expect(result!.colorCoding).toEqual({ 
        '5': 'normal',
        '3': 'normal'
      });
    });

    it('should detect outliers with 3+ players', () => {
      const round: EstimationRound = {
        cards: new Map([
          [testPlayer1.id, '5'],
          [testPlayer2.id, '5'],
          [testPlayer3.id, '8']
        ]),
        isRevealed: true,
        startedAt: new Date()
      };
      
      db.setCurrentRound(testRoom.id, round);
      
      const result = getEstimationPatterns(testRoom.id);
      
      expect(result).toBeTruthy();
      expect(result!.consensus).toBe(false);
      expect(result!.majorityCard).toBe('5'); // 2 out of 3 votes
      expect(result!.outliers).toEqual(['8']); // single vote with 3+ players
      expect(result!.colorCoding).toEqual({ 
        '5': 'majority',
        '8': 'outlier'
      });
    });

    it('should detect outliers with 4+ players', () => {
      // Add a fourth player
      const testPlayer4: Player = {
        id: 'player-4',
        name: 'David',
        isConnected: true,
        joinedAt: new Date()
      };
      db.addPlayerToRoom(testRoom.id, testPlayer4);

      const round: EstimationRound = {
        cards: new Map([
          [testPlayer1.id, '5'],
          [testPlayer2.id, '5'],
          [testPlayer3.id, '8'],
          [testPlayer4.id, '13']
        ]),
        isRevealed: true,
        startedAt: new Date()
      };
      
      db.setCurrentRound(testRoom.id, round);
      
      const result = getEstimationPatterns(testRoom.id);
      
      expect(result).toBeTruthy();
      expect(result!.consensus).toBe(false);
      expect(result!.majorityCard).toBeNull(); // No card has >50% votes
      expect(result!.outliers).toEqual(['8', '13']); // Cards with only 1 vote
      expect(result!.colorCoding).toEqual({ 
        '5': 'normal',
        '8': 'outlier',
        '13': 'outlier'
      });
    });
  });

  describe('getCardDistribution', () => {
    it('should return null for unrevealed round', () => {
      const round: EstimationRound = {
        cards: new Map([
          [testPlayer1.id, '5'],
          [testPlayer2.id, '8']
        ]),
        isRevealed: false,
        startedAt: new Date()
      };
      
      db.setCurrentRound(testRoom.id, round);
      
      const result = getCardDistribution(testRoom.id);
      expect(result).toBeNull();
    });

    it('should calculate card distribution correctly', () => {
      const round: EstimationRound = {
        cards: new Map([
          [testPlayer1.id, '5'],
          [testPlayer2.id, '5'],
          [testPlayer3.id, '8']
        ]),
        isRevealed: true,
        startedAt: new Date()
      };
      
      db.setCurrentRound(testRoom.id, round);
      
      const result = getCardDistribution(testRoom.id);
      
      expect(result).toEqual({
        '5': 2,
        '8': 1
      });
    });
  });
});