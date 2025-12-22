import { EstimationService, EstimationRound, EstimationResult, CardValue, PLANNING_POKER_DECK } from '../types';
import { db } from '../database/in-memory-db';
import { calculateEstimationResult } from '../database/statistics';

/**
 * Estimation Service implementation for Planning Poker system
 * Handles estimation round lifecycle, card management, and results calculation
 */
export class EstimationServiceImpl implements EstimationService {

  /**
   * Starts a new estimation round in the specified room
   * Clears any previous round state and begins fresh
   * Requirements: 2.1, 2.2
   */
  startRound(roomId: string): void {
    if (!roomId) {
      throw new Error('Room ID is required');
    }

    const room = db.getRoom(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.players.length === 0) {
      throw new Error('Cannot start round with no players');
    }

    // Create new estimation round with empty card selections
    const newRound: EstimationRound = {
      cards: new Map<string, string>(),
      isRevealed: false,
      startedAt: new Date()
    };

    // Set the new round, clearing any previous state
    const success = db.setCurrentRound(roomId, newRound);
    if (!success) {
      throw new Error('Failed to start estimation round');
    }
  }

  /**
   * Submits a card selection for a player in the current round
   * Records selection without revealing to other players
   * Requirements: 4.2, 4.3
   */
  submitCard(roomId: string, playerId: string, cardValue: string): void {
    if (!roomId || !playerId || cardValue === undefined) {
      throw new Error('Room ID, player ID, and card value are required');
    }

    // Validate card value is from the standard deck
    if (!PLANNING_POKER_DECK.includes(cardValue as CardValue)) {
      throw new Error(`Invalid card value. Must be one of: ${PLANNING_POKER_DECK.join(', ')}`);
    }

    const room = db.getRoom(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Check if player is in the room
    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('Player not found in room');
    }

    const currentRound = db.getCurrentRound(roomId);
    if (!currentRound) {
      throw new Error('No active estimation round');
    }

    if (currentRound.isRevealed) {
      throw new Error('Cannot submit card after cards have been revealed');
    }

    // Record the card selection
    const success = db.addCardToCurrentRound(roomId, playerId, cardValue);
    if (!success) {
      throw new Error('Failed to submit card');
    }
  }

  /**
   * Reveals all cards and calculates results for the current round
   * Requirements: 5.1
   */
  revealCards(roomId: string): EstimationResult | null {
    if (!roomId) {
      throw new Error('Room ID is required');
    }

    const room = db.getRoom(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const currentRound = db.getCurrentRound(roomId);
    if (!currentRound) {
      throw new Error('No active estimation round');
    }

    if (currentRound.isRevealed) {
      throw new Error('Cards have already been revealed');
    }

    // Mark round as revealed
    const success = db.revealCardsInCurrentRound(roomId);
    if (!success) {
      throw new Error('Failed to reveal cards');
    }

    // Use centralized statistics calculation
    return calculateEstimationResult(roomId);
  }

  /**
   * Gets the current round state for a room
   * Requirements: 2.1, 2.2
   */
  getRoundState(roomId: string): EstimationRound | null {
    if (!roomId) {
      return null;
    }

    return db.getCurrentRound(roomId);
  }

  /**
   * Checks if all players in a room have submitted their cards
   * Requirements: 4.5
   */
  areAllCardsSubmitted(roomId: string): boolean {
    if (!roomId) {
      return false;
    }

    const room = db.getRoom(roomId);
    if (!room) {
      return false;
    }

    const currentRound = db.getCurrentRound(roomId);
    if (!currentRound) {
      return false;
    }

    // Check if all connected players have submitted cards
    const connectedPlayers = room.players.filter(p => p.isConnected);
    if (connectedPlayers.length === 0) {
      return false;
    }

    return connectedPlayers.every(player => currentRound.cards.has(player.id));
  }

  /**
   * Gets the selection status for all players in a room
   * Requirements: 4.4
   */
  getPlayerSelectionStatus(roomId: string): Array<{
    playerId: string;
    playerName: string;
    hasSelected: boolean;
    isConnected: boolean;
  }> {
    if (!roomId) {
      return [];
    }

    const room = db.getRoom(roomId);
    if (!room) {
      return [];
    }

    const currentRound = db.getCurrentRound(roomId);
    
    return room.players.map(player => ({
      playerId: player.id,
      playerName: player.name,
      hasSelected: currentRound ? currentRound.cards.has(player.id) : false,
      isConnected: player.isConnected
    }));
  }

  /**
   * Calculates estimation results for a revealed round
   * Requirements: 5.1
   */
  calculateEstimationResult(roomId: string): EstimationResult | null {
    return calculateEstimationResult(roomId);
  }
}

// Export singleton instance
export const estimationService = new EstimationServiceImpl();