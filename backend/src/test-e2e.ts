/**
 * End-to-End Integration Tests for Planning Poker System
 * Tests complete workflow from room creation to card reveal
 * Requirements: All requirements
 */

import { Server } from 'socket.io';
import { createServer } from 'http';
import { io as Client, Socket } from 'socket.io-client';
import { WebSocketService } from './services/websocket-service';
import { roomService, playerService } from './services';
import { db } from './database';

describe('Planning Poker End-to-End Tests', () => {
  let httpServer: any;
  let ioServer: Server;
  let webSocketService: WebSocketService;
  let clientSockets: Socket[] = [];
  const port = 3002; // Use different port for testing

  beforeAll((done) => {
    httpServer = createServer();
    ioServer = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    webSocketService = new WebSocketService(ioServer);
    
    httpServer.listen(port, () => {
      console.log(`Test server running on port ${port}`);
      done();
    });
  });

  afterAll((done) => {
    ioServer.close();
    httpServer.close(done);
  });

  beforeEach(() => {
    // Clear database before each test
    db.clear();
    
    // Disconnect all client sockets
    clientSockets.forEach(socket => {
      if (socket.connected) {
        socket.disconnect();
      }
    });
    clientSockets = [];
  });

  afterEach(() => {
    // Clean up any remaining connections
    clientSockets.forEach(socket => {
      if (socket.connected) {
        socket.disconnect();
      }
    });
    clientSockets = [];
  });

  /**
   * Helper function to create a client socket
   */
  const createClientSocket = (): Promise<Socket> => {
    return new Promise((resolve) => {
      const clientSocket = Client(`http://localhost:${port}`);
      clientSockets.push(clientSocket);
      
      clientSocket.on('connect', () => {
        resolve(clientSocket);
      });
    });
  };

  /**
   * Helper function to wait for an event
   */
  const waitForEvent = (socket: Socket, event: string, timeout = 5000): Promise<any> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout);

      socket.once(event, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  };

  describe('Complete Planning Poker Workflow', () => {
    test('should complete full workflow from room creation to card reveal', async () => {
      // Step 1: Create room
      const room = roomService.createRoom('Test Room');
      expect(room).toBeDefined();
      expect(room.name).toBe('Test Room');
      expect(room.id).toBeDefined();

      // Step 2: Create client sockets for multiple players
      const player1Socket = await createClientSocket();
      const player2Socket = await createClientSocket();
      const player3Socket = await createClientSocket();

      // Step 3: Players join the room
      const joinPromises = [
        waitForEvent(player1Socket, 'room-joined'),
        waitForEvent(player2Socket, 'room-joined'),
        waitForEvent(player3Socket, 'room-joined')
      ];

      player1Socket.emit('join-room', { roomId: room.id, playerName: 'Alice' });
      player2Socket.emit('join-room', { roomId: room.id, playerName: 'Bob' });
      player3Socket.emit('join-room', { roomId: room.id, playerName: 'Charlie' });

      const joinResults = await Promise.all(joinPromises);
      
      // Verify all players joined successfully
      expect(joinResults).toHaveLength(3);
      joinResults.forEach(result => {
        expect(result.room).toBeDefined();
        expect(result.room.id).toBe(room.id);
      });

      // Step 4: Start estimation round
      const roundStartPromises = [
        waitForEvent(player1Socket, 'round-started'),
        waitForEvent(player2Socket, 'round-started'),
        waitForEvent(player3Socket, 'round-started')
      ];

      player1Socket.emit('start-round', {});
      await Promise.all(roundStartPromises);

      // Step 5: Players select cards
      const cardSelectionPromises = [
        waitForEvent(player1Socket, 'player-selection-status'),
        waitForEvent(player2Socket, 'player-selection-status'),
        waitForEvent(player3Socket, 'player-selection-status')
      ];

      player1Socket.emit('select-card', { cardValue: '5' });
      player2Socket.emit('select-card', { cardValue: '8' });
      player3Socket.emit('select-card', { cardValue: '5' });

      // Wait for all selection status updates
      await Promise.all(cardSelectionPromises);

      // Step 6: Reveal cards
      const revealPromises = [
        waitForEvent(player1Socket, 'cards-revealed'),
        waitForEvent(player2Socket, 'cards-revealed'),
        waitForEvent(player3Socket, 'cards-revealed')
      ];

      player1Socket.emit('reveal-cards', {});
      const revealResults = await Promise.all(revealPromises);

      // Step 7: Verify results
      expect(revealResults).toHaveLength(3);
      const result = revealResults[0].result;
      
      expect(result).toBeDefined();
      expect(result.cards).toHaveLength(3);
      expect(result.statistics).toBeDefined();
      expect(result.statistics.average).toBeCloseTo(6); // (5 + 8 + 5) / 3 = 6
      expect(result.statistics.median).toBe('5');
      
      // Verify all cards are present
      const cardValues = result.cards.map((card: any) => card.cardValue).sort();
      expect(cardValues).toEqual(['5', '5', '8']);
    }, 15000);

    test('should handle player disconnection and reconnection', async () => {
      // Create room and initial players
      const room = roomService.createRoom('Reconnection Test Room');
      const player1Socket = await createClientSocket();
      const player2Socket = await createClientSocket();

      // Players join
      const joinPromise1 = waitForEvent(player1Socket, 'room-joined');
      const joinPromise2 = waitForEvent(player2Socket, 'room-joined');

      player1Socket.emit('join-room', { roomId: room.id, playerName: 'Alice' });
      player2Socket.emit('join-room', { roomId: room.id, playerName: 'Bob' });

      await Promise.all([joinPromise1, joinPromise2]);

      // Start round
      const roundStartPromises = [
        waitForEvent(player1Socket, 'round-started'),
        waitForEvent(player2Socket, 'round-started')
      ];

      player1Socket.emit('start-round', {});
      await Promise.all(roundStartPromises);

      // Player 1 selects card
      player1Socket.emit('select-card', { cardValue: '3' });

      // Player 1 disconnects
      const disconnectPromise = waitForEvent(player2Socket, 'player-left');
      player1Socket.disconnect();
      await disconnectPromise;

      // Player 1 reconnects
      const reconnectedSocket = await createClientSocket();
      const reconnectPromise = waitForEvent(reconnectedSocket, 'room-joined');
      
      reconnectedSocket.emit('join-room', { roomId: room.id, playerName: 'Alice' });
      const reconnectResult = await reconnectPromise;

      // Verify state was preserved
      expect(reconnectResult.room).toBeDefined();
      expect(reconnectResult.room.id).toBe(room.id);
      
      // Verify player can continue with the round
      player2Socket.emit('select-card', { cardValue: '5' });
      
      const revealPromises = [
        waitForEvent(reconnectedSocket, 'cards-revealed'),
        waitForEvent(player2Socket, 'cards-revealed')
      ];

      reconnectedSocket.emit('reveal-cards', {});
      const revealResults = await Promise.all(revealPromises);

      expect(revealResults[0].result.cards).toHaveLength(2);
    }, 15000);

    test('should maintain room isolation between different rooms', async () => {
      // Create two separate rooms
      const room1 = roomService.createRoom('Room 1');
      const room2 = roomService.createRoom('Room 2');

      // Create players for each room
      const room1Player1 = await createClientSocket();
      const room1Player2 = await createClientSocket();
      const room2Player1 = await createClientSocket();
      const room2Player2 = await createClientSocket();

      // Players join their respective rooms
      const joinPromises = [
        waitForEvent(room1Player1, 'room-joined'),
        waitForEvent(room1Player2, 'room-joined'),
        waitForEvent(room2Player1, 'room-joined'),
        waitForEvent(room2Player2, 'room-joined')
      ];

      room1Player1.emit('join-room', { roomId: room1.id, playerName: 'Alice' });
      room1Player2.emit('join-room', { roomId: room1.id, playerName: 'Bob' });
      room2Player1.emit('join-room', { roomId: room2.id, playerName: 'Charlie' });
      room2Player2.emit('join-room', { roomId: room2.id, playerName: 'David' });

      await Promise.all(joinPromises);

      // Start rounds in both rooms
      const room1RoundPromises = [
        waitForEvent(room1Player1, 'round-started'),
        waitForEvent(room1Player2, 'round-started')
      ];

      const room2RoundPromises = [
        waitForEvent(room2Player1, 'round-started'),
        waitForEvent(room2Player2, 'round-started')
      ];

      room1Player1.emit('start-round', {});
      room2Player1.emit('start-round', {});

      await Promise.all([...room1RoundPromises, ...room2RoundPromises]);

      // Players select different cards in each room
      room1Player1.emit('select-card', { cardValue: '1' });
      room1Player2.emit('select-card', { cardValue: '2' });
      room2Player1.emit('select-card', { cardValue: '8' });
      room2Player2.emit('select-card', { cardValue: '13' });

      // Reveal cards in room 1 only
      const room1RevealPromises = [
        waitForEvent(room1Player1, 'cards-revealed'),
        waitForEvent(room1Player2, 'cards-revealed')
      ];

      room1Player1.emit('reveal-cards', {});
      const room1Results = await Promise.all(room1RevealPromises);

      // Verify room 1 results
      expect(room1Results[0].result.cards).toHaveLength(2);
      const room1CardValues = room1Results[0].result.cards.map((card: any) => card.cardValue).sort();
      expect(room1CardValues).toEqual(['1', '2']);

      // Verify room 2 players didn't receive room 1's reveal event
      let room2ReceivedReveal = false;
      room2Player1.on('cards-revealed', () => {
        room2ReceivedReveal = true;
      });

      // Wait a bit to ensure no cross-room events
      await new Promise(resolve => setTimeout(resolve, 1000));
      expect(room2ReceivedReveal).toBe(false);

      // Now reveal cards in room 2
      const room2RevealPromises = [
        waitForEvent(room2Player1, 'cards-revealed'),
        waitForEvent(room2Player2, 'cards-revealed')
      ];

      room2Player1.emit('reveal-cards', {});
      const room2Results = await Promise.all(room2RevealPromises);

      // Verify room 2 results are different
      expect(room2Results[0].result.cards).toHaveLength(2);
      const room2CardValues = room2Results[0].result.cards.map((card: any) => card.cardValue).sort();
      expect(room2CardValues).toEqual(['13', '8']);
    }, 20000);

    test('should handle error conditions gracefully', async () => {
      const room = roomService.createRoom('Error Test Room');
      const playerSocket = await createClientSocket();

      // Test joining with invalid data
      const errorPromise1 = waitForEvent(playerSocket, 'error');
      playerSocket.emit('join-room', { roomId: '', playerName: 'Alice' });
      const error1 = await errorPromise1;
      expect(error1.message).toContain('Room ID');

      // Test joining with invalid player name
      const errorPromise2 = waitForEvent(playerSocket, 'error');
      playerSocket.emit('join-room', { roomId: room.id, playerName: '' });
      const error2 = await errorPromise2;
      expect(error2.message).toContain('Player name');

      // Successfully join room
      const joinPromise = waitForEvent(playerSocket, 'room-joined');
      playerSocket.emit('join-room', { roomId: room.id, playerName: 'Alice' });
      await joinPromise;

      // Test selecting card without active round
      const errorPromise3 = waitForEvent(playerSocket, 'error');
      playerSocket.emit('select-card', { cardValue: '5' });
      const error3 = await errorPromise3;
      expect(error3.message).toContain('round');

      // Start round
      const roundStartPromise = waitForEvent(playerSocket, 'round-started');
      playerSocket.emit('start-round', {});
      await roundStartPromise;

      // Test selecting invalid card
      const errorPromise4 = waitForEvent(playerSocket, 'error');
      playerSocket.emit('select-card', { cardValue: 'invalid' });
      const error4 = await errorPromise4;
      expect(error4.message).toContain('Invalid card value');

      // Test revealing cards without all players selecting
      const errorPromise5 = waitForEvent(playerSocket, 'error');
      playerSocket.emit('reveal-cards', {});
      const error5 = await errorPromise5;
      expect(error5.message).toContain('cards');
    }, 15000);

    test('should handle multiple rounds in sequence', async () => {
      const room = roomService.createRoom('Multi-Round Test');
      const player1Socket = await createClientSocket();
      const player2Socket = await createClientSocket();

      // Join room
      const joinPromises = [
        waitForEvent(player1Socket, 'room-joined'),
        waitForEvent(player2Socket, 'room-joined')
      ];

      player1Socket.emit('join-room', { roomId: room.id, playerName: 'Alice' });
      player2Socket.emit('join-room', { roomId: room.id, playerName: 'Bob' });
      await Promise.all(joinPromises);

      // Round 1
      let roundStartPromises = [
        waitForEvent(player1Socket, 'round-started'),
        waitForEvent(player2Socket, 'round-started')
      ];

      player1Socket.emit('start-round', {});
      await Promise.all(roundStartPromises);

      player1Socket.emit('select-card', { cardValue: '3' });
      player2Socket.emit('select-card', { cardValue: '5' });

      let revealPromises = [
        waitForEvent(player1Socket, 'cards-revealed'),
        waitForEvent(player2Socket, 'cards-revealed')
      ];

      player1Socket.emit('reveal-cards', {});
      const round1Results = await Promise.all(revealPromises);

      expect(round1Results[0].result.cards).toHaveLength(2);
      expect(round1Results[0].result.statistics.average).toBeCloseTo(4);

      // Round 2
      roundStartPromises = [
        waitForEvent(player1Socket, 'round-started'),
        waitForEvent(player2Socket, 'round-started')
      ];

      player1Socket.emit('start-round', {});
      await Promise.all(roundStartPromises);

      player1Socket.emit('select-card', { cardValue: '8' });
      player2Socket.emit('select-card', { cardValue: '13' });

      revealPromises = [
        waitForEvent(player1Socket, 'cards-revealed'),
        waitForEvent(player2Socket, 'cards-revealed')
      ];

      player1Socket.emit('reveal-cards', {});
      const round2Results = await Promise.all(revealPromises);

      expect(round2Results[0].result.cards).toHaveLength(2);
      expect(round2Results[0].result.statistics.average).toBeCloseTo(10.5);

      // Verify rounds are independent
      const round2CardValues = round2Results[0].result.cards.map((card: any) => card.cardValue).sort();
      expect(round2CardValues).toEqual(['13', '8']);
    }, 20000);
  });

  describe('Real-time Updates', () => {
    test('should broadcast player join/leave events in real-time', async () => {
      const room = roomService.createRoom('Real-time Test');
      const player1Socket = await createClientSocket();
      const player2Socket = await createClientSocket();

      // Player 1 joins
      const joinPromise1 = waitForEvent(player1Socket, 'room-joined');
      player1Socket.emit('join-room', { roomId: room.id, playerName: 'Alice' });
      await joinPromise1;

      // Player 2 should receive notification when player 1 joined
      // (This happens during the join process, so we set up the listener first)
      const playerJoinedPromise = waitForEvent(player1Socket, 'player-joined');
      
      const joinPromise2 = waitForEvent(player2Socket, 'room-joined');
      player2Socket.emit('join-room', { roomId: room.id, playerName: 'Bob' });
      
      await Promise.all([joinPromise2, playerJoinedPromise]);

      // Player 1 should receive notification about player 2 leaving
      const playerLeftPromise = waitForEvent(player1Socket, 'player-left');
      player2Socket.disconnect();
      
      const leftEvent = await playerLeftPromise;
      expect(leftEvent.playerId).toBeDefined();
    }, 10000);

    test('should broadcast card selection status in real-time', async () => {
      const room = roomService.createRoom('Selection Status Test');
      const player1Socket = await createClientSocket();
      const player2Socket = await createClientSocket();

      // Both players join
      const joinPromises = [
        waitForEvent(player1Socket, 'room-joined'),
        waitForEvent(player2Socket, 'room-joined')
      ];

      player1Socket.emit('join-room', { roomId: room.id, playerName: 'Alice' });
      player2Socket.emit('join-room', { roomId: room.id, playerName: 'Bob' });
      await Promise.all(joinPromises);

      // Start round
      const roundStartPromises = [
        waitForEvent(player1Socket, 'round-started'),
        waitForEvent(player2Socket, 'round-started')
      ];

      player1Socket.emit('start-round', {});
      await Promise.all(roundStartPromises);

      // Player 2 should receive notification when player 1 selects card
      const selectionStatusPromise = waitForEvent(player2Socket, 'player-selection-status');
      
      player1Socket.emit('select-card', { cardValue: '5' });
      
      const statusUpdate = await selectionStatusPromise;
      expect(statusUpdate.players).toBeDefined();
      expect(statusUpdate.players.length).toBeGreaterThan(0);
      
      // Find Alice's status
      const aliceStatus = statusUpdate.players.find((p: any) => p.playerName === 'Alice');
      expect(aliceStatus).toBeDefined();
      expect(aliceStatus.hasSelected).toBe(true);
    }, 10000);
  });
});