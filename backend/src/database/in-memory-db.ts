import { Room, Player, EstimationRound, RoomId, PlayerId } from '../types';

/**
 * In-memory database for Planning Poker system
 * Stores all application state in memory for fast access
 */
export class InMemoryDatabase {
  private rooms: Map<RoomId, Room> = new Map();
  private playerRoomMap: Map<PlayerId, RoomId> = new Map();

  // Room operations
  createRoom(room: Room): void {
    this.rooms.set(room.id, { ...room });
  }

  getRoom(roomId: RoomId): Room | null {
    const room = this.rooms.get(roomId);
    return room ? { ...room } : null;
  }

  updateRoom(roomId: RoomId, updates: Partial<Room>): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const updatedRoom = { ...room, ...updates };
    this.rooms.set(roomId, updatedRoom);
    return true;
  }

  deleteRoom(roomId: RoomId): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    // Remove all players from the room mapping
    room.players.forEach(player => {
      this.playerRoomMap.delete(player.id);
    });

    return this.rooms.delete(roomId);
  }

  getAllRooms(): Room[] {
    return Array.from(this.rooms.values()).map(room => ({ ...room }));
  }

  // Player operations
  addPlayerToRoom(roomId: RoomId, player: Player): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    // Remove player from any existing room first
    this.removePlayerFromCurrentRoom(player.id);

    // Add player to new room
    const updatedPlayers = [...room.players, { ...player }];
    this.rooms.set(roomId, { ...room, players: updatedPlayers });
    this.playerRoomMap.set(player.id, roomId);
    
    return true;
  }

  removePlayerFromRoom(roomId: RoomId, playerId: PlayerId): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const updatedPlayers = room.players.filter(p => p.id !== playerId);
    
    // Clean up voting state if there's an active round
    let updatedRoom = { ...room, players: updatedPlayers };
    if (room.currentRound) {
      const updatedCards = new Map(room.currentRound.cards);
      updatedCards.delete(playerId); // Remove player's vote
      
      updatedRoom = {
        ...updatedRoom,
        currentRound: {
          ...room.currentRound,
          cards: updatedCards
        }
      };
    }
    
    this.rooms.set(roomId, updatedRoom);
    this.playerRoomMap.delete(playerId);

    return true;
  }

  removePlayerFromCurrentRoom(playerId: PlayerId): boolean {
    const currentRoomId = this.playerRoomMap.get(playerId);
    if (!currentRoomId) return false;

    return this.removePlayerFromRoom(currentRoomId, playerId);
  }

  updatePlayerInRoom(roomId: RoomId, playerId: PlayerId, updates: Partial<Player>): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return false;

    const updatedPlayer = { ...room.players[playerIndex], ...updates };
    const updatedPlayers = [...room.players];
    updatedPlayers[playerIndex] = updatedPlayer;

    // If player is being marked as disconnected, clean up their voting state
    // This allows them to vote fresh when they reconnect
    let updatedRoom = { ...room, players: updatedPlayers };
    if (updates.isConnected === false && room.currentRound && !room.currentRound.isRevealed) {
      const updatedCards = new Map(room.currentRound.cards);
      updatedCards.delete(playerId); // Remove player's vote so they can vote again when reconnecting
      
      updatedRoom = {
        ...updatedRoom,
        currentRound: {
          ...room.currentRound,
          cards: updatedCards
        }
      };
    }

    this.rooms.set(roomId, updatedRoom);
    return true;
  }

  getPlayerRoom(playerId: PlayerId): RoomId | null {
    return this.playerRoomMap.get(playerId) || null;
  }

  getPlayersInRoom(roomId: RoomId): Player[] {
    const room = this.rooms.get(roomId);
    return room ? room.players.map(p => ({ ...p })) : [];
  }

  // Estimation round operations
  setCurrentRound(roomId: RoomId, round: EstimationRound | undefined): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    this.rooms.set(roomId, { 
      ...room, 
      currentRound: round ? { 
        ...round,
        cards: new Map(round.cards) // Deep copy the Map
      } : undefined 
    });
    return true;
  }

  getCurrentRound(roomId: RoomId): EstimationRound | null {
    const room = this.rooms.get(roomId);
    if (!room || !room.currentRound) return null;

    return {
      ...room.currentRound,
      cards: new Map(room.currentRound.cards) // Deep copy the Map
    };
  }

  addCardToCurrentRound(roomId: RoomId, playerId: PlayerId, cardValue: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || !room.currentRound) return false;

    const updatedCards = new Map(room.currentRound.cards);
    updatedCards.set(playerId, cardValue);

    const updatedRound = {
      ...room.currentRound,
      cards: updatedCards
    };

    this.rooms.set(roomId, { ...room, currentRound: updatedRound });
    return true;
  }

  revealCardsInCurrentRound(roomId: RoomId): boolean {
    const room = this.rooms.get(roomId);
    if (!room || !room.currentRound) return false;

    const updatedRound = {
      ...room.currentRound,
      isRevealed: true
    };

    this.rooms.set(roomId, { ...room, currentRound: updatedRound });
    return true;
  }

  // Utility methods
  getRoomCount(): number {
    return this.rooms.size;
  }

  getTotalPlayerCount(): number {
    return this.playerRoomMap.size;
  }

  getActiveRoomsCount(): number {
    return Array.from(this.rooms.values()).filter(room => room.players.length > 0).length;
  }

  // Debug/admin methods
  clear(): void {
    this.rooms.clear();
    this.playerRoomMap.clear();
  }

  getDebugInfo(): {
    roomCount: number;
    playerCount: number;
    activeRooms: number;
    rooms: Array<{ id: string; name: string; playerCount: number; hasActiveRound: boolean }>;
  } {
    const rooms = Array.from(this.rooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      playerCount: room.players.length,
      hasActiveRound: !!room.currentRound
    }));

    return {
      roomCount: this.getRoomCount(),
      playerCount: this.getTotalPlayerCount(),
      activeRooms: this.getActiveRoomsCount(),
      rooms
    };
  }
}

// Singleton instance
export const db = new InMemoryDatabase();