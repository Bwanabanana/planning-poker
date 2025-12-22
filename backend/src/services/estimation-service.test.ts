import { EstimationServiceImpl } from './estimation-service';
import { db } from '../database/in-memory-db';
import { Room, Player } from '../types';

describe('EstimationService', () => {
  let estimationService: EstimationServiceImpl;
  let testRoom: Room;
  let testPlayer1: Player;
  let testPlayer2: Player;

  beforeEach(() => {
    // Clear database before each test
    db.clear();
    
    estimationService = new EstimationServiceImpl();
    
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
    
    // Set up test room with players
    db.createRoom(testRoom);
    db.addPlayerToRoom(testRoom.id, testPlayer1);
    db.addPlayerToRoom(testRoom.id, testPlayer2);
  });

  describe('startRound', () => {
    it('should start a new estimation round', () => {
      estimationService.startRound(testRoom.id);
      
      const round = estimationService.getRoundState(testRoom.id);
      expect(round).toBeTruthy();
      expect(round!.isRevealed).toBe(false);
      expect(round!.cards.size).toBe(0);
      expect(round!.startedAt).toBeInstanceOf(Date);
    });

    it('should clear previous round state when starting new round', () => {
      // Start first round and add some cards
      estimationService.startRound(testRoom.id);
      estimationService.submitCard(testRoom.id, testPlayer1.id, '5');
      
      // Start second round
      estimationService.startRound(testRoom.id);
      
      const round = estimationService.getRoundState(testRoom.id);
      expect(round!.cards.size).toBe(0);
      expect(round!.isRevealed).toBe(false);
    });

    it('should throw error for non-existent room', () => {
      expect(() => {
        estimationService.startRound('non-existent-room');
      }).toThrow('Room not found');
    });

    it('should throw error for room with no players', () => {
      const emptyRoom: Room = {
        id: 'empty-room',
        name: 'Empty Room',
        createdAt: new Date(),
        players: []
      };
      db.createRoom(emptyRoom);
      
      expect(() => {
        estimationService.startRound(emptyRoom.id);
      }).toThrow('Cannot start round with no players');
    });
  });

  describe('submitCard', () => {
    beforeEach(() => {
      estimationService.startRound(testRoom.id);
    });

    it('should record card selection for player', () => {
      estimationService.submitCard(testRoom.id, testPlayer1.id, '5');
      
      const round = estimationService.getRoundState(testRoom.id);
      expect(round!.cards.get(testPlayer1.id)).toBe('5');
    });

    it('should allow player to change card selection', () => {
      estimationService.submitCard(testRoom.id, testPlayer1.id, '3');
      estimationService.submitCard(testRoom.id, testPlayer1.id, '8');
      
      const round = estimationService.getRoundState(testRoom.id);
      expect(round!.cards.get(testPlayer1.id)).toBe('8');
    });

    it('should validate card values against standard deck', () => {
      expect(() => {
        estimationService.submitCard(testRoom.id, testPlayer1.id, 'invalid-card');
      }).toThrow('Invalid card value');
    });

    it('should accept all standard deck values', () => {
      const standardDeck = ['0.5', '1', '2', '3', '5', '8', '13', '21', '?', '☕'];
      
      standardDeck.forEach((cardValue, index) => {
        const playerId = `player-${index}`;
        const player: Player = {
          id: playerId,
          name: `Player ${index}`,
          isConnected: true,
          joinedAt: new Date()
        };
        
        db.addPlayerToRoom(testRoom.id, player);
        
        expect(() => {
          estimationService.submitCard(testRoom.id, playerId, cardValue);
        }).not.toThrow();
      });
    });

    it('should throw error if no active round', () => {
      // Don't start a round
      db.setCurrentRound(testRoom.id, undefined);
      
      expect(() => {
        estimationService.submitCard(testRoom.id, testPlayer1.id, '5');
      }).toThrow('No active estimation round');
    });

    it('should allow card changes after cards are revealed for real-time collaboration', () => {
      estimationService.submitCard(testRoom.id, testPlayer1.id, '5');
      estimationService.submitCard(testRoom.id, testPlayer2.id, '8');
      estimationService.revealCards(testRoom.id);
      
      // Should allow card changes after reveal
      expect(() => {
        estimationService.submitCard(testRoom.id, testPlayer1.id, '3');
      }).not.toThrow();
      
      // Verify the card was actually updated
      const result = estimationService.revealCards(testRoom.id);
      expect(result).toBeTruthy();
      if (result) {
        const player1Card = result.cards.find(c => c.playerId === testPlayer1.id);
        expect(player1Card?.cardValue).toBe('3');
      }
    });
  });

  describe('revealCards', () => {
    beforeEach(() => {
      estimationService.startRound(testRoom.id);
      estimationService.submitCard(testRoom.id, testPlayer1.id, '5');
      estimationService.submitCard(testRoom.id, testPlayer2.id, '8');
    });

    it('should reveal cards and return results', () => {
      const result = estimationService.revealCards(testRoom.id);
      
      expect(result).toBeTruthy();
      expect(result!.cards).toHaveLength(2);
      expect(result!.cards.find(c => c.playerId === testPlayer1.id)?.cardValue).toBe('5');
      expect(result!.cards.find(c => c.playerId === testPlayer2.id)?.cardValue).toBe('8');
    });

    it('should calculate statistics correctly', () => {
      const result = estimationService.revealCards(testRoom.id);
      
      expect(result!.statistics.average).toBe(6.5);
      expect(result!.statistics.median).toBe('6.5');
      expect(result!.statistics.range).toEqual(['5', '8']);
      expect(result!.statistics.hasVariance).toBe(true);
    });

    it('should handle non-numeric cards in statistics', () => {
      // Start new round with non-numeric cards
      estimationService.startRound(testRoom.id);
      estimationService.submitCard(testRoom.id, testPlayer1.id, '?');
      estimationService.submitCard(testRoom.id, testPlayer2.id, '☕');
      
      const result = estimationService.revealCards(testRoom.id);
      
      expect(result!.statistics.average).toBe(0);
      expect(result!.statistics.median).toBe('?');
      expect(result!.statistics.range).toEqual(['?', '☕']);
      expect(result!.statistics.hasVariance).toBe(false);
    });

    it('should allow re-revealing cards for real-time collaboration', () => {
      const firstResult = estimationService.revealCards(testRoom.id);
      
      // Should allow revealing again (for recalculating results after card changes)
      expect(() => {
        estimationService.revealCards(testRoom.id);
      }).not.toThrow();
      
      // Results should still be valid
      const secondResult = estimationService.revealCards(testRoom.id);
      expect(secondResult).toBeTruthy();
      expect(secondResult?.cards.length).toBe(firstResult?.cards.length);
    });
  });

  describe('areAllCardsSubmitted', () => {
    beforeEach(() => {
      estimationService.startRound(testRoom.id);
    });

    it('should return false when no cards submitted', () => {
      expect(estimationService.areAllCardsSubmitted(testRoom.id)).toBe(false);
    });

    it('should return false when only some cards submitted', () => {
      estimationService.submitCard(testRoom.id, testPlayer1.id, '5');
      
      expect(estimationService.areAllCardsSubmitted(testRoom.id)).toBe(false);
    });

    it('should return true when all connected players submitted cards', () => {
      estimationService.submitCard(testRoom.id, testPlayer1.id, '5');
      estimationService.submitCard(testRoom.id, testPlayer2.id, '8');
      
      expect(estimationService.areAllCardsSubmitted(testRoom.id)).toBe(true);
    });

    it('should ignore disconnected players', () => {
      // Disconnect one player
      db.updatePlayerInRoom(testRoom.id, testPlayer2.id, { isConnected: false });
      
      // Only connected player submits card
      estimationService.submitCard(testRoom.id, testPlayer1.id, '5');
      
      expect(estimationService.areAllCardsSubmitted(testRoom.id)).toBe(true);
    });
  });

  describe('getPlayerSelectionStatus', () => {
    beforeEach(() => {
      estimationService.startRound(testRoom.id);
    });

    it('should return selection status for all players', () => {
      estimationService.submitCard(testRoom.id, testPlayer1.id, '5');
      
      const status = estimationService.getPlayerSelectionStatus(testRoom.id);
      
      expect(status).toHaveLength(2);
      expect(status.find(s => s.playerId === testPlayer1.id)?.hasSelected).toBe(true);
      expect(status.find(s => s.playerId === testPlayer2.id)?.hasSelected).toBe(false);
    });

    it('should include player names and connection status', () => {
      const status = estimationService.getPlayerSelectionStatus(testRoom.id);
      
      expect(status.find(s => s.playerId === testPlayer1.id)?.playerName).toBe('Alice');
      expect(status.find(s => s.playerId === testPlayer1.id)?.isConnected).toBe(true);
    });
  });

  describe('Card Selection Privacy and Status Tracking', () => {
    beforeEach(() => {
      estimationService.startRound(testRoom.id);
    });

    it('should record card selections without revealing values to other players', () => {
      // Player 1 submits card
      estimationService.submitCard(testRoom.id, testPlayer1.id, '5');
      
      // Get round state - cards should be recorded but not revealed
      const round = estimationService.getRoundState(testRoom.id);
      expect(round!.cards.has(testPlayer1.id)).toBe(true);
      expect(round!.cards.get(testPlayer1.id)).toBe('5');
      expect(round!.isRevealed).toBe(false);
      
      // Status should show player has selected without revealing value
      const status = estimationService.getPlayerSelectionStatus(testRoom.id);
      const player1Status = status.find(s => s.playerId === testPlayer1.id);
      expect(player1Status?.hasSelected).toBe(true);
      // The status doesn't include the actual card value - privacy maintained
      expect(player1Status).not.toHaveProperty('cardValue');
    });

    it('should track selection status changes when players update their cards', () => {
      // Initially no selections
      let status = estimationService.getPlayerSelectionStatus(testRoom.id);
      expect(status.every(s => !s.hasSelected)).toBe(true);
      
      // Player 1 selects card
      estimationService.submitCard(testRoom.id, testPlayer1.id, '3');
      status = estimationService.getPlayerSelectionStatus(testRoom.id);
      expect(status.find(s => s.playerId === testPlayer1.id)?.hasSelected).toBe(true);
      expect(status.find(s => s.playerId === testPlayer2.id)?.hasSelected).toBe(false);
      
      // Player 1 changes card - status should remain true
      estimationService.submitCard(testRoom.id, testPlayer1.id, '8');
      status = estimationService.getPlayerSelectionStatus(testRoom.id);
      expect(status.find(s => s.playerId === testPlayer1.id)?.hasSelected).toBe(true);
      
      // Player 2 selects card
      estimationService.submitCard(testRoom.id, testPlayer2.id, '5');
      status = estimationService.getPlayerSelectionStatus(testRoom.id);
      expect(status.every(s => s.hasSelected)).toBe(true);
    });

    it('should maintain privacy until cards are explicitly revealed', () => {
      // Both players submit cards
      estimationService.submitCard(testRoom.id, testPlayer1.id, '5');
      estimationService.submitCard(testRoom.id, testPlayer2.id, '8');
      
      // Round state should show cards are not revealed
      const round = estimationService.getRoundState(testRoom.id);
      expect(round!.isRevealed).toBe(false);
      
      // Only when explicitly revealing should card values become visible
      const result = estimationService.revealCards(testRoom.id);
      expect(result!.cards).toHaveLength(2);
      expect(result!.cards.find(c => c.playerId === testPlayer1.id)?.cardValue).toBe('5');
      expect(result!.cards.find(c => c.playerId === testPlayer2.id)?.cardValue).toBe('8');
      
      // After reveal, round should be marked as revealed
      const revealedRound = estimationService.getRoundState(testRoom.id);
      expect(revealedRound!.isRevealed).toBe(true);
    });

    it('should broadcast selection status without revealing card values', () => {
      // This test verifies the interface for WebSocket broadcasting
      // The actual broadcasting will be handled by the WebSocket service
      
      estimationService.submitCard(testRoom.id, testPlayer1.id, '13');
      
      const status = estimationService.getPlayerSelectionStatus(testRoom.id);
      const player1Status = status.find(s => s.playerId === testPlayer1.id);
      
      // Status contains information suitable for broadcasting
      expect(player1Status).toEqual({
        playerId: testPlayer1.id,
        playerName: testPlayer1.name,
        hasSelected: true,
        isConnected: true
      });
      
      // Verify no card value is exposed in the status
      expect(Object.keys(player1Status!)).not.toContain('cardValue');
    });
  });
});