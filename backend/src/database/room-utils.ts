import { v4 as uuidv4 } from 'uuid';
import { Room, Player, EstimationRound } from '../types';
import { db } from './in-memory-db';

/**
 * Utility functions for room management
 */

export function createRoom(name: string): Room {
  const trimmedName = name.trim();
  const room: Room = {
    id: trimmedName, // Use room name as ID
    name: trimmedName,
    createdAt: new Date(),
    players: [],
    currentRound: undefined
  };

  db.createRoom(room);
  return room;
}

export function createPlayer(name: string): Player {
  return {
    id: uuidv4(),
    name: name.trim(),
    isConnected: true,
    joinedAt: new Date()
  };
}

export function createEstimationRound(): EstimationRound {
  return {
    cards: new Map(),
    isRevealed: false,
    startedAt: new Date()
  };
}

export function joinRoom(roomId: string, playerName: string): { success: boolean; room?: Room; player?: Player; error?: string } {
  const room = db.getRoom(roomId);
  if (!room) {
    return { success: false, error: 'Room not found' };
  }

  // Check if player name is already taken in this room
  const existingPlayer = room.players.find(p => p.name.toLowerCase() === playerName.toLowerCase());
  if (existingPlayer) {
    if (!existingPlayer.isConnected) {
      // Reuse existing player - just update connection status and preserve all state
      console.log(`Reconnecting existing player ${existingPlayer.id} (${playerName}) - preserving state`);
      const success = db.updatePlayerInRoom(roomId, existingPlayer.id, { isConnected: true });
      if (!success) {
        return { success: false, error: 'Failed to reconnect player' };
      }
      
      const updatedRoom = db.getRoom(roomId);
      const updatedPlayer = updatedRoom!.players.find(p => p.id === existingPlayer.id);
      return { success: true, room: updatedRoom!, player: updatedPlayer! };
    } else {
      // Player is still connected, can't join with same name
      return { success: false, error: 'Player name already taken in this room' };
    }
  }

  // No existing player with this name - create new player
  const player = createPlayer(playerName);
  const success = db.addPlayerToRoom(roomId, player);
  
  if (!success) {
    return { success: false, error: 'Failed to join room' };
  }

  const updatedRoom = db.getRoom(roomId);
  return { success: true, room: updatedRoom!, player };
}

export function leaveRoom(playerId: string): { success: boolean; roomId?: string } {
  const roomId = db.getPlayerRoom(playerId);
  if (!roomId) {
    return { success: false };
  }

  const success = db.removePlayerFromRoom(roomId, playerId);
  return { success, roomId: success ? roomId : undefined };
}

export function startEstimationRound(roomId: string): { success: boolean; error?: string } {
  const room = db.getRoom(roomId);
  if (!room) {
    return { success: false, error: 'Room not found' };
  }

  if (room.players.length === 0) {
    return { success: false, error: 'Cannot start round with no players' };
  }

  const newRound = createEstimationRound();
  const success = db.setCurrentRound(roomId, newRound);
  
  return { success, error: success ? undefined : 'Failed to start round' };
}

export function submitCard(roomId: string, playerId: string, cardValue: string): { success: boolean; error?: string } {
  const room = db.getRoom(roomId);
  if (!room) {
    return { success: false, error: 'Room not found' };
  }

  if (!room.currentRound) {
    return { success: false, error: 'No active estimation round' };
  }

  if (room.currentRound.isRevealed) {
    return { success: false, error: 'Cards have already been revealed' };
  }

  // Check if player is in the room
  const player = room.players.find(p => p.id === playerId);
  if (!player) {
    return { success: false, error: 'Player not in room' };
  }

  const success = db.addCardToCurrentRound(roomId, playerId, cardValue);
  return { success, error: success ? undefined : 'Failed to submit card' };
}

export function revealCards(roomId: string): { success: boolean; error?: string } {
  const room = db.getRoom(roomId);
  if (!room) {
    return { success: false, error: 'Room not found' };
  }

  if (!room.currentRound) {
    return { success: false, error: 'No active estimation round' };
  }

  if (room.currentRound.isRevealed) {
    return { success: false, error: 'Cards are already revealed' };
  }

  const success = db.revealCardsInCurrentRound(roomId);
  return { success, error: success ? undefined : 'Failed to reveal cards' };
}

export function updatePlayerConnectionStatus(playerId: string, isConnected: boolean): { success: boolean; roomId?: string } {
  const roomId = db.getPlayerRoom(playerId);
  if (!roomId) {
    return { success: false };
  }

  const success = db.updatePlayerInRoom(roomId, playerId, { isConnected });
  return { success, roomId: success ? roomId : undefined };
}

export function getAllPlayersWithCards(roomId: string): Array<{ playerId: string; playerName: string; hasSelected: boolean }> {
  const room = db.getRoom(roomId);
  if (!room || !room.currentRound) {
    return [];
  }

  return room.players.map(player => ({
    playerId: player.id,
    playerName: player.name,
    hasSelected: room.currentRound!.cards.has(player.id)
  }));
}

export function isEstimationComplete(roomId: string): boolean {
  const room = db.getRoom(roomId);
  if (!room || !room.currentRound) {
    return false;
  }

  const connectedPlayers = room.players.filter(p => p.isConnected);
  return connectedPlayers.length > 0 && connectedPlayers.every(player => 
    room.currentRound!.cards.has(player.id)
  );
}