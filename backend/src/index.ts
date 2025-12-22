import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { db } from './database';
import { roomService, playerService } from './services';
import { WebSocketService } from './services/websocket-service';
import { ClientEvents, ServerEvents } from './shared-types';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Initialize WebSocket service
const webSocketService = new WebSocketService(io);

// Middleware
app.use(cors({
  origin: true, // Allow all origins in development
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.use(express.json());

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database debug endpoint
app.get('/api/debug', (req, res) => {
  res.json(db.getDebugInfo());
});

// Test endpoint to create a room
app.post('/api/rooms', (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Room name is required' });
    }
    
    const room = roomService.createRoom(name);
    res.json({ room });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create room';
    res.status(400).json({ error: errorMessage });
  }
});

// Get all rooms
app.get('/api/rooms', (req, res) => {
  try {
    const rooms = roomService.getAllRooms();
    res.json({ rooms });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get rooms' });
  }
});

// Get specific room
app.get('/api/rooms/:roomId', (req, res) => {
  try {
    const { roomId } = req.params;
    const room = roomService.getRoomState(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json({ room });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get room' });
  }
});

// Join a room
app.post('/api/rooms/:roomId/join', (req, res) => {
  try {
    const { roomId } = req.params;
    const { playerName } = req.body;
    
    if (!playerName || typeof playerName !== 'string') {
      return res.status(400).json({ error: 'Player name is required' });
    }

    const result = playerService.joinRoom(roomId, playerName);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ room: result.room, player: result.player });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to join room';
    res.status(400).json({ error: errorMessage });
  }
});

// Leave a room
app.post('/api/players/:playerId/leave', (req, res) => {
  try {
    const { playerId } = req.params;
    
    const result = playerService.leaveRoom(playerId);
    if (!result.success) {
      return res.status(400).json({ error: 'Failed to leave room' });
    }

    res.json({ success: true, roomId: result.roomId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to leave room';
    res.status(400).json({ error: errorMessage });
  }
});

// Get players in a room
app.get('/api/rooms/:roomId/players', (req, res) => {
  try {
    const { roomId } = req.params;
    const players = playerService.getPlayersInRoom(roomId);
    res.json({ players });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get players' });
  }
});

// Update player connection status
app.put('/api/players/:playerId/connection', (req, res) => {
  try {
    const { playerId } = req.params;
    const { isConnected } = req.body;
    
    if (typeof isConnected !== 'boolean') {
      return res.status(400).json({ error: 'isConnected must be a boolean' });
    }

    const result = playerService.updateConnectionStatus(playerId, isConnected);
    if (!result.success) {
      return res.status(400).json({ error: 'Failed to update connection status' });
    }

    res.json({ success: true, roomId: result.roomId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update connection status';
    res.status(400).json({ error: errorMessage });
  }
});

// WebSocket connection statistics endpoint
app.get('/api/websocket/stats', (req, res) => {
  try {
    const stats = webSocketService.getConnectionStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get WebSocket stats' });
  }
});

// Get disconnected players endpoint
app.get('/api/websocket/disconnected', (req, res) => {
  try {
    const disconnectedPlayers = webSocketService.getDisconnectedPlayers();
    res.json({ disconnectedPlayers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get disconnected players' });
  }
});

// Cleanup disconnected players endpoint (admin)
app.post('/api/websocket/cleanup', (req, res) => {
  try {
    const { maxDisconnectedTimeMs } = req.body;
    const cleanedCount = webSocketService.cleanupDisconnectedPlayers(maxDisconnectedTimeMs);
    res.json({ cleanedCount, message: `Cleaned up ${cleanedCount} disconnected players` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cleanup disconnected players' });
  }
});

// Restore player connection endpoint (admin)
app.post('/api/websocket/restore/:playerId', (req, res) => {
  try {
    const { playerId } = req.params;
    const success = webSocketService.restorePlayerConnection(playerId);
    if (success) {
      res.json({ success: true, message: 'Player connection restored' });
    } else {
      res.status(400).json({ success: false, error: 'Failed to restore player connection' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore player connection' });
  }
});

// WebSocket connection handling is now managed by WebSocketService
// No additional socket.io setup needed here

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Planning Poker server running on port ${PORT}`);
  console.log(`Database initialized with in-memory storage`);
});

export { app, server, io, webSocketService };