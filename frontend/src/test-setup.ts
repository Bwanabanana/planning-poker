// Test setup for frontend
import '@testing-library/jest-dom';

// Mock import.meta for Vite compatibility
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_WEBSOCKET_URL: 'http://localhost:3001'
      }
    }
  }
});

// Global test configuration
jest.setTimeout(10000); // 10 second timeout for tests

// Mock WebSocket for tests
const mockSocket = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  connected: true
};

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket)
}));

// Global test utilities - using declare global to fix TypeScript issues
declare global {
  var createMockRoom: () => any;
  var createMockPlayer: (overrides?: any) => any;
  var mockSocket: any;
}

global.createMockRoom = () => ({
  id: 'test-room-id',
  name: 'Test Room',
  createdAt: new Date(),
  players: [],
  currentRound: undefined
});

global.createMockPlayer = (overrides = {}) => ({
  id: 'test-player-id',
  name: 'Test Player',
  isConnected: true,
  joinedAt: new Date(),
  ...overrides
});

global.mockSocket = mockSocket;

global.React = require("react");

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});