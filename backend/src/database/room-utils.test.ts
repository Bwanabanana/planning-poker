import { 
  createRoom, 
  createPlayer, 
  createEstimationRound,
  joinRoom,
  leaveRoom,
  startEstimationRound,
  submitCard,
  revealCards,
  updatePlayerConnectionStatus,
  getAllPlayersWithCards,
  isEstimationComplete
} from './room-utils';
import { db } from './in-memory-db';

describe('Room Utils', () => {
  beforeEach(() => {
    db.clear();
  });

  describe('createRoom', () => {
    it('should create a room with unique ID', () => {
      const room1 = createRoom('Test Room 1');
      const room2 = createRoom('Test Room 2');
      
      expect(room1.id).toBeDefined();
      expect(room2.id).toBeDefined();
      expect(room1.id).not.toBe(room2.id);
      expect(room1.name).toBe('Test Room 1');
      expect(room2.name).toBe('Test Room 2');
    });

    it('should trim room names', () => {
      const room = createRoom('  Trimmed Room  ');
      expect(room.name).toBe('Trimmed Room');
    });
  });

  describe('createPlayer', () => {
    it('should create a player with unique ID', () => {
      const player1 = createPlayer('Player 1');
      const player2 = createPlayer('Player 2');
      
      expect(player1.id).toBeDefined();
      expect(player2.id).toBeDefined();
      expect(player1.id).not.toBe(player2.id);
      expect(player1.name).toBe('Player 1');
      expect(player1.isConnected).toBe(true);
    });

    it('should trim player names', () => {
      const player = createPlayer('  Trimmed Player  ');
      expect(player.name).toBe('Trimmed Player');
    });
  });

  describe('joinRoom', () => {
    it('should successfully join an existing room', () => {
      const room = createRoom('Test Room');
      const result = joinRoom(room.id, 'Test Player');
      
      expect(result.success).toBe(true);
      expect(result.room).toBeDefined();
      expect(result.player).toBeDefined();
      expect(result.room?.players).toHaveLength(1);
      expect(result.player?.name).toBe('Test Player');
    });

    it('should fail to join non-existent room', () => {
      const result = joinRoom('non-existent', 'Test Player');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Room not found');
    });

    it('should prevent duplicate player names in same room', () => {
      const room = createRoom('Test Room');
      joinRoom(room.id, 'Test Player');
      const result = joinRoom(room.id, 'Test Player');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Player name already taken in this room');
    });

    it('should be case insensitive for duplicate names', () => {
      const room = createRoom('Test Room');
      joinRoom(room.id, 'Test Player');
      const result = joinRoom(room.id, 'test player');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Player name already taken in this room');
    });
  });

  describe('startEstimationRound', () => {
    it('should start a round in room with players', () => {
      const room = createRoom('Test Room');
      joinRoom(room.id, 'Test Player');
      
      const result = startEstimationRound(room.id);
      
      expect(result.success).toBe(true);
      const updatedRoom = db.getRoom(room.id);
      expect(updatedRoom?.currentRound).toBeDefined();
      expect(updatedRoom?.currentRound?.isRevealed).toBe(false);
    });

    it('should fail to start round in empty room', () => {
      const room = createRoom('Test Room');
      const result = startEstimationRound(room.id);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot start round with no players');
    });

    it('should fail for non-existent room', () => {
      const result = startEstimationRound('non-existent');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Room not found');
    });
  });

  describe('submitCard', () => {
    let roomId: string;
    let playerId: string;

    beforeEach(() => {
      const room = createRoom('Test Room');
      roomId = room.id;
      const joinResult = joinRoom(roomId, 'Test Player');
      playerId = joinResult.player!.id;
      startEstimationRound(roomId);
    });

    it('should successfully submit a card', () => {
      const result = submitCard(roomId, playerId, '5');
      
      expect(result.success).toBe(true);
      const round = db.getCurrentRound(roomId);
      expect(round?.cards.get(playerId)).toBe('5');
    });

    it('should fail if no active round', () => {
      db.setCurrentRound(roomId, undefined);
      const result = submitCard(roomId, playerId, '5');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No active estimation round');
    });

    it('should fail if cards already revealed', () => {
      submitCard(roomId, playerId, '5');
      revealCards(roomId);
      
      const result = submitCard(roomId, playerId, '8');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cards have already been revealed');
    });

    it('should fail if player not in room', () => {
      const result = submitCard(roomId, 'non-existent-player', '5');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Player not in room');
    });
  });

  describe('isEstimationComplete', () => {
    let roomId: string;
    let player1Id: string;
    let player2Id: string;

    beforeEach(() => {
      const room = createRoom('Test Room');
      roomId = room.id;
      const join1 = joinRoom(roomId, 'Player 1');
      const join2 = joinRoom(roomId, 'Player 2');
      player1Id = join1.player!.id;
      player2Id = join2.player!.id;
      startEstimationRound(roomId);
    });

    it('should return false when no cards submitted', () => {
      expect(isEstimationComplete(roomId)).toBe(false);
    });

    it('should return false when only some players submitted', () => {
      submitCard(roomId, player1Id, '5');
      expect(isEstimationComplete(roomId)).toBe(false);
    });

    it('should return true when all connected players submitted', () => {
      submitCard(roomId, player1Id, '5');
      submitCard(roomId, player2Id, '8');
      expect(isEstimationComplete(roomId)).toBe(true);
    });

    it('should ignore disconnected players', () => {
      updatePlayerConnectionStatus(player2Id, false);
      submitCard(roomId, player1Id, '5');
      expect(isEstimationComplete(roomId)).toBe(true);
    });
  });

  describe('getAllPlayersWithCards', () => {
    let roomId: string;
    let player1Id: string;
    let player2Id: string;

    beforeEach(() => {
      const room = createRoom('Test Room');
      roomId = room.id;
      const join1 = joinRoom(roomId, 'Player 1');
      const join2 = joinRoom(roomId, 'Player 2');
      player1Id = join1.player!.id;
      player2Id = join2.player!.id;
      startEstimationRound(roomId);
    });

    it('should show card selection status for all players', () => {
      submitCard(roomId, player1Id, '5');
      
      const playersWithCards = getAllPlayersWithCards(roomId);
      
      expect(playersWithCards).toHaveLength(2);
      
      const player1Status = playersWithCards.find(p => p.playerId === player1Id);
      const player2Status = playersWithCards.find(p => p.playerId === player2Id);
      
      expect(player1Status?.hasSelected).toBe(true);
      expect(player2Status?.hasSelected).toBe(false);
      expect(player1Status?.playerName).toBe('Player 1');
      expect(player2Status?.playerName).toBe('Player 2');
    });
  });
});