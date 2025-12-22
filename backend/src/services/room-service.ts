import { Room, Player, RoomService } from '../types';
import { createRoom as createRoomUtil, joinRoom, leaveRoom } from '../database/room-utils';
import { db } from '../database/in-memory-db';

/**
 * Room Service implementation for Planning Poker system
 * Handles room creation, configuration, and player management
 */
export class RoomServiceImpl implements RoomService {
  
  /**
   * Creates a new room with unique name validation
   * Requirements: 1.1, 1.2, 1.3
   */
  createRoom(roomName: string): Room {
    if (!roomName || roomName.trim().length === 0) {
      throw new Error('Room name cannot be empty');
    }

    if (roomName.trim().length > 100) {
      throw new Error('Room name cannot exceed 100 characters');
    }

    const trimmedName = roomName.trim();
    
    // Check if room name already exists - if so, just return the existing room
    const existingRoom = db.getRoom(trimmedName);
    if (existingRoom) {
      return existingRoom;
    }

    // Use the existing utility function which now uses name as ID
    const room = createRoomUtil(trimmedName);
    return room;
  }

  /**
   * Adds a player to a room
   * Requirements: 3.1, 3.2, 1.4
   */
  addPlayer(roomId: string, player: Player): void {
    if (!roomId || !player) {
      throw new Error('Room ID and player are required');
    }

    const room = db.getRoom(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Check if player name is already taken in this room
    const existingPlayer = room.players.find(p => p.name.toLowerCase() === player.name.toLowerCase());
    if (existingPlayer) {
      throw new Error('Player name already taken in this room');
    }

    const success = db.addPlayerToRoom(roomId, player);
    if (!success) {
      throw new Error('Failed to add player to room');
    }
  }

  /**
   * Removes a player from a room
   * Requirements: 3.1, 3.2, 1.4
   */
  removePlayer(roomId: string, playerId: string): void {
    if (!roomId || !playerId) {
      throw new Error('Room ID and player ID are required');
    }

    const success = db.removePlayerFromRoom(roomId, playerId);
    if (!success) {
      throw new Error('Failed to remove player from room');
    }
  }

  /**
   * Gets the current state of a room
   * Requirements: 1.2, 1.3
   */
  getRoomState(roomId: string): Room | null {
    if (!roomId) {
      return null;
    }

    return db.getRoom(roomId);
  }

  /**
   * Gets all rooms in the system
   * Requirements: 1.4 (for room isolation verification)
   */
  getAllRooms(): Room[] {
    return db.getAllRooms();
  }

  /**
   * Updates room configuration
   * Requirements: 1.2, 1.3
   */
  updateRoomConfiguration(roomId: string, updates: { name?: string }): Room | null {
    if (!roomId) {
      return null;
    }

    const room = db.getRoom(roomId);
    if (!room) {
      return null;
    }

    const roomUpdates: Partial<Room> = {};
    
    if (updates.name !== undefined) {
      if (updates.name.trim().length === 0) {
        throw new Error('Room name cannot be empty');
      }
      if (updates.name.trim().length > 100) {
        throw new Error('Room name cannot exceed 100 characters');
      }
      roomUpdates.name = updates.name.trim();
    }

    const success = db.updateRoom(roomId, roomUpdates);
    return success ? db.getRoom(roomId) : null;
  }

  /**
   * Checks if a room exists
   * Requirements: 1.1
   */
  roomExists(roomId: string): boolean {
    if (!roomId) {
      return false;
    }
    return db.getRoom(roomId) !== null;
  }

  /**
   * Gets room statistics for debugging/monitoring
   */
  getRoomStatistics() {
    return db.getDebugInfo();
  }
}

// Export singleton instance
export const roomService = new RoomServiceImpl();