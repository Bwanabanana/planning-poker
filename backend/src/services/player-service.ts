import { Player, Room } from '../types';
import { createPlayer, joinRoom as joinRoomUtil, leaveRoom as leaveRoomUtil, updatePlayerConnectionStatus } from '../database/room-utils';
import { db } from '../database/in-memory-db';

/**
 * Player Service implementation for Planning Poker system
 * Handles player management within rooms with proper isolation
 */
export class PlayerService {
  
  /**
   * Creates a new player with unique ID
   * Requirements: 3.1
   */
  createPlayer(name: string): Player {
    if (!name || name.trim().length === 0) {
      throw new Error('Player name cannot be empty');
    }

    if (name.trim().length > 50) {
      throw new Error('Player name cannot exceed 50 characters');
    }

    return createPlayer(name);
  }

  /**
   * Adds a player to a specific room with proper isolation
   * Requirements: 3.1, 3.2, 1.4
   */
  joinRoom(roomId: string, playerName: string): { success: boolean; room?: Room; player?: Player; error?: string } {
    if (!roomId || !playerName) {
      return { success: false, error: 'Room ID and player name are required' };
    }

    // Validate room exists
    const room = db.getRoom(roomId);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    // Use the existing utility function which handles room isolation
    const result = joinRoomUtil(roomId, playerName);
    return result;
  }

  /**
   * Removes a player from their current room
   * Requirements: 3.1, 3.2, 1.4
   */
  leaveRoom(playerId: string): { success: boolean; roomId?: string } {
    if (!playerId) {
      return { success: false };
    }

    // Use the existing utility function which handles room isolation
    const result = leaveRoomUtil(playerId);
    return result;
  }

  /**
   * Gets all players in a specific room (room isolation)
   * Requirements: 1.4, 3.2
   */
  getPlayersInRoom(roomId: string): Player[] {
    if (!roomId) {
      return [];
    }

    return db.getPlayersInRoom(roomId);
  }

  /**
   * Gets the room that a player is currently in
   * Requirements: 3.2, 1.4
   */
  getPlayerRoom(playerId: string): string | null {
    if (!playerId) {
      return null;
    }

    return db.getPlayerRoom(playerId);
  }

  /**
   * Updates a player's connection status
   * Requirements: 3.4, 3.5
   */
  updateConnectionStatus(playerId: string, isConnected: boolean): { success: boolean; roomId?: string } {
    if (!playerId) {
      return { success: false };
    }

    return updatePlayerConnectionStatus(playerId, isConnected);
  }

  /**
   * Checks if a player exists in a specific room
   * Requirements: 1.4, 3.2
   */
  isPlayerInRoom(playerId: string, roomId: string): boolean {
    if (!playerId || !roomId) {
      return false;
    }

    const room = db.getRoom(roomId);
    if (!room) {
      return false;
    }

    return room.players.some(player => player.id === playerId);
  }

  /**
   * Gets a player by ID from a specific room (ensures room isolation)
   * Requirements: 1.4, 3.2
   */
  getPlayerInRoom(playerId: string, roomId: string): Player | null {
    if (!playerId || !roomId) {
      return null;
    }

    const room = db.getRoom(roomId);
    if (!room) {
      return null;
    }

    const player = room.players.find(p => p.id === playerId);
    return player ? { ...player } : null;
  }

  /**
   * Moves a player from one room to another (handles room isolation)
   * Requirements: 1.4, 3.1, 3.2
   */
  movePlayerToRoom(playerId: string, newRoomId: string): { success: boolean; error?: string } {
    if (!playerId || !newRoomId) {
      return { success: false, error: 'Player ID and room ID are required' };
    }

    // Get current player info
    const currentRoomId = db.getPlayerRoom(playerId);
    if (!currentRoomId) {
      return { success: false, error: 'Player not found in any room' };
    }

    const currentRoom = db.getRoom(currentRoomId);
    if (!currentRoom) {
      return { success: false, error: 'Current room not found' };
    }

    const player = currentRoom.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, error: 'Player not found in current room' };
    }

    // Check if target room exists
    const targetRoom = db.getRoom(newRoomId);
    if (!targetRoom) {
      return { success: false, error: 'Target room not found' };
    }

    // Check if player name is already taken in target room
    const nameConflict = targetRoom.players.find(p => p.name.toLowerCase() === player.name.toLowerCase());
    if (nameConflict) {
      return { success: false, error: 'Player name already taken in target room' };
    }

    // Remove from current room
    const leaveResult = this.leaveRoom(playerId);
    if (!leaveResult.success) {
      return { success: false, error: 'Failed to leave current room' };
    }

    // Add to new room
    const joinResult = this.joinRoom(newRoomId, player.name);
    if (!joinResult.success) {
      // Try to re-add to original room if join fails
      db.addPlayerToRoom(currentRoomId, player);
      return { success: false, error: joinResult.error || 'Failed to join new room' };
    }

    return { success: true };
  }

  /**
   * Gets statistics about players across all rooms
   * Requirements: 1.4 (for monitoring room isolation)
   */
  getPlayerStatistics(): {
    totalPlayers: number;
    connectedPlayers: number;
    playersPerRoom: Array<{ roomId: string; roomName: string; playerCount: number; connectedCount: number }>;
  } {
    const rooms = db.getAllRooms();
    const playersPerRoom = rooms.map(room => ({
      roomId: room.id,
      roomName: room.name,
      playerCount: room.players.length,
      connectedCount: room.players.filter(p => p.isConnected).length
    }));

    const totalPlayers = playersPerRoom.reduce((sum, room) => sum + room.playerCount, 0);
    const connectedPlayers = playersPerRoom.reduce((sum, room) => sum + room.connectedCount, 0);

    return {
      totalPlayers,
      connectedPlayers,
      playersPerRoom
    };
  }
}

// Export singleton instance
export const playerService = new PlayerService();