import { InMemoryDatabase } from './in-memory-db';
import { Room, Player, EstimationRound } from '../types';

describe('InMemoryDatabase', () => {
  let db: InMemoryDatabase;
  let mockRoom: Room;
  let mockPlayer: Player;

  beforeEach(() => {
    db = new InMemoryDatabase();
    mockRoom = {
      id: 'room-1',
      name: 'Test Room',
      createdAt: new Date(),
      players: [],
      currentRound: undefined
    };
    mockPlayer = {
      id: 'player-1',
      name: 'Test Player',
      isConnected: true,
      joinedAt: new Date()
    };
  });

  describe('Room Operations', () => {
    it('should create and retrieve a room', () => {
      db.createRoom(mockRoom);
      const retrieved = db.getRoom('room-1');
      
      expect(retrieved).toEqual(mockRoom);
      expect(retrieved).not.toBe(mockRoom); // Should be a copy
    });

    it('should return null for non-existent room', () => {
      const retrieved = db.getRoom('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should update a room', () => {
      db.createRoom(mockRoom);
      const success = db.updateRoom('room-1', { name: 'Updated Room' });
      
      expect(success).toBe(true);
      const updated = db.getRoom('room-1');
      expect(updated?.name).toBe('Updated Room');
    });

    it('should delete a room and clean up player mappings', () => {
      db.createRoom(mockRoom);
      db.addPlayerToRoom('room-1', mockPlayer);
      
      const success = db.deleteRoom('room-1');
      
      expect(success).toBe(true);
      expect(db.getRoom('room-1')).toBeNull();
      expect(db.getPlayerRoom('player-1')).toBeNull();
    });

    it('should get all rooms', () => {
      const room2 = { ...mockRoom, id: 'room-2', name: 'Room 2' };
      db.createRoom(mockRoom);
      db.createRoom(room2);
      
      const allRooms = db.getAllRooms();
      expect(allRooms).toHaveLength(2);
      expect(allRooms.map(r => r.id)).toContain('room-1');
      expect(allRooms.map(r => r.id)).toContain('room-2');
    });
  });

  describe('Player Operations', () => {
    beforeEach(() => {
      db.createRoom(mockRoom);
    });

    it('should add player to room', () => {
      const success = db.addPlayerToRoom('room-1', mockPlayer);
      
      expect(success).toBe(true);
      const room = db.getRoom('room-1');
      expect(room?.players).toHaveLength(1);
      expect(room?.players[0]).toEqual(mockPlayer);
      expect(db.getPlayerRoom('player-1')).toBe('room-1');
    });

    it('should remove player from existing room when adding to new room', () => {
      const room2 = { ...mockRoom, id: 'room-2', name: 'Room 2' };
      db.createRoom(room2);
      
      db.addPlayerToRoom('room-1', mockPlayer);
      db.addPlayerToRoom('room-2', mockPlayer);
      
      expect(db.getRoom('room-1')?.players).toHaveLength(0);
      expect(db.getRoom('room-2')?.players).toHaveLength(1);
      expect(db.getPlayerRoom('player-1')).toBe('room-2');
    });

    it('should remove player from room', () => {
      db.addPlayerToRoom('room-1', mockPlayer);
      const success = db.removePlayerFromRoom('room-1', 'player-1');
      
      expect(success).toBe(true);
      expect(db.getRoom('room-1')?.players).toHaveLength(0);
      expect(db.getPlayerRoom('player-1')).toBeNull();
    });

    it('should update player in room', () => {
      db.addPlayerToRoom('room-1', mockPlayer);
      const success = db.updatePlayerInRoom('room-1', 'player-1', { isConnected: false });
      
      expect(success).toBe(true);
      const room = db.getRoom('room-1');
      expect(room?.players[0].isConnected).toBe(false);
    });

    it('should get players in room', () => {
      const player2 = { ...mockPlayer, id: 'player-2', name: 'Player 2' };
      db.addPlayerToRoom('room-1', mockPlayer);
      db.addPlayerToRoom('room-1', player2);
      
      const players = db.getPlayersInRoom('room-1');
      expect(players).toHaveLength(2);
      expect(players.map(p => p.id)).toContain('player-1');
      expect(players.map(p => p.id)).toContain('player-2');
    });
  });

  describe('Estimation Round Operations', () => {
    let mockRound: EstimationRound;

    beforeEach(() => {
      db.createRoom(mockRoom);
      mockRound = {
        cards: new Map([['player-1', '5']]),
        isRevealed: false,
        startedAt: new Date()
      };
    });

    it('should set and get current round', () => {
      const success = db.setCurrentRound('room-1', mockRound);
      
      expect(success).toBe(true);
      const retrieved = db.getCurrentRound('room-1');
      expect(retrieved?.isRevealed).toBe(false);
      expect(retrieved?.cards.get('player-1')).toBe('5');
    });

    it('should add card to current round', () => {
      db.setCurrentRound('room-1', mockRound);
      const success = db.addCardToCurrentRound('room-1', 'player-2', '8');
      
      expect(success).toBe(true);
      const round = db.getCurrentRound('room-1');
      expect(round?.cards.get('player-2')).toBe('8');
    });

    it('should reveal cards in current round', () => {
      db.setCurrentRound('room-1', mockRound);
      const success = db.revealCardsInCurrentRound('room-1');
      
      expect(success).toBe(true);
      const round = db.getCurrentRound('room-1');
      expect(round?.isRevealed).toBe(true);
    });
  });

  describe('Utility Methods', () => {
    it('should provide accurate counts', () => {
      db.createRoom(mockRoom);
      db.addPlayerToRoom('room-1', mockPlayer);
      
      expect(db.getRoomCount()).toBe(1);
      expect(db.getTotalPlayerCount()).toBe(1);
      expect(db.getActiveRoomsCount()).toBe(1);
    });

    it('should clear all data', () => {
      db.createRoom(mockRoom);
      db.addPlayerToRoom('room-1', mockPlayer);
      
      db.clear();
      
      expect(db.getRoomCount()).toBe(0);
      expect(db.getTotalPlayerCount()).toBe(0);
    });

    it('should provide debug info', () => {
      db.createRoom(mockRoom);
      db.addPlayerToRoom('room-1', mockPlayer);
      
      const debugInfo = db.getDebugInfo();
      
      expect(debugInfo.roomCount).toBe(1);
      expect(debugInfo.playerCount).toBe(1);
      expect(debugInfo.activeRooms).toBe(1);
      expect(debugInfo.rooms).toHaveLength(1);
      expect(debugInfo.rooms[0].id).toBe('room-1');
    });
  });
});