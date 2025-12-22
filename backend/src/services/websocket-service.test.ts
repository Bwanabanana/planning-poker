import { WebSocketService } from './websocket-service';
import { Server } from 'socket.io';
import { createServer } from 'http';

describe('WebSocketService', () => {
  let webSocketService: WebSocketService;
  let io: Server;
  let httpServer: any;

  beforeEach(() => {
    httpServer = createServer();
    io = new Server(httpServer);
    webSocketService = new WebSocketService(io);
  });

  afterEach(() => {
    io.close();
    httpServer.close();
  });

  describe('Connection Statistics', () => {
    it('should return initial connection stats', () => {
      const stats = webSocketService.getConnectionStats();
      
      expect(stats).toEqual({
        totalConnections: 0,
        playersConnected: 0,
        playersDisconnected: 0,
        roomConnections: []
      });
    });
  });

  describe('Player Connection Management', () => {
    it('should return false for non-existent player connection', () => {
      const isConnected = webSocketService.isPlayerConnected('non-existent-player');
      expect(isConnected).toBe(false);
    });

    it('should return empty array for disconnected players initially', () => {
      const disconnectedPlayers = webSocketService.getDisconnectedPlayers();
      expect(disconnectedPlayers).toEqual([]);
    });

    it('should return 0 for cleanup when no disconnected players exist', () => {
      const cleanedCount = webSocketService.cleanupDisconnectedPlayers();
      expect(cleanedCount).toBe(0);
    });
  });

  describe('Broadcasting', () => {
    it('should have broadcastToRoom method', () => {
      expect(typeof webSocketService.broadcastToRoom).toBe('function');
    });

    it('should have sendToPlayer method', () => {
      expect(typeof webSocketService.sendToPlayer).toBe('function');
    });

    it('should not throw when broadcasting to non-existent room', () => {
      expect(() => {
        webSocketService.broadcastToRoom('non-existent-room', 'test-event', { data: 'test' });
      }).not.toThrow();
    });

    it('should not throw when sending to non-existent player', () => {
      expect(() => {
        webSocketService.sendToPlayer('non-existent-player', 'test-event', { data: 'test' });
      }).not.toThrow();
    });
  });

  describe('Admin Functions', () => {
    it('should return false when trying to disconnect non-existent player', () => {
      const result = webSocketService.disconnectPlayer('non-existent-player');
      expect(result).toBe(false);
    });

    it('should return false when trying to restore non-existent player connection', () => {
      const result = webSocketService.restorePlayerConnection('non-existent-player');
      expect(result).toBe(false);
    });
  });
});