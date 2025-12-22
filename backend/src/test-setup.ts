// Test setup for backend
// This file is run before each test suite
import { Room, Player } from './shared-types';

// Global test configuration
jest.setTimeout(10000); // 10 second timeout for tests

// Mock console methods in tests to reduce noise
const originalConsole = console;

beforeEach(() => {
  // Reset console mocks before each test
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  // Restore console after each test
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
});

// Global test utilities
(global as any).createMockRoom = (): Room => ({
  id: 'test-room-id',
  name: 'Test Room',
  createdAt: new Date(),
  players: [],
  currentRound: undefined
});

(global as any).createMockPlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 'test-player-id',
  name: 'Test Player',
  isConnected: true,
  joinedAt: new Date(),
  ...overrides
});