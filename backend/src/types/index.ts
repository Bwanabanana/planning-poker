// Re-export shared types
export * from '../shared-types';

// Backend-specific interfaces

export interface RoomService {
  createRoom(roomName: string): Room;
  addPlayer(roomId: string, player: Player): void;
  removePlayer(roomId: string, playerId: string): void;
  getRoomState(roomId: string): Room | null;
  getAllRooms(): Room[];
}

export interface EstimationService {
  startRound(roomId: string): void;
  submitCard(roomId: string, playerId: string, cardValue: string): void;
  revealCards(roomId: string): EstimationResult | null;
  getRoundState(roomId: string): EstimationRound | null;
}

export interface WebSocketServiceInterface {
  broadcastToRoom(roomId: string, event: string, data: any): void;
  sendToPlayer(playerId: string, event: string, data: any): void;
  getConnectionStats(): {
    totalConnections: number;
    playersConnected: number;
    playersDisconnected: number;
    roomConnections: Array<{ roomId: string; playerCount: number; connectedCount: number; disconnectedCount: number }>;
  };
  disconnectPlayer(playerId: string): boolean;
  isPlayerConnected(playerId: string): boolean;
  getDisconnectedPlayers(): Array<{ playerId: string; playerName: string; roomId: string; disconnectedAt: Date }>;
  cleanupDisconnectedPlayers(maxDisconnectedTimeMs?: number): number;
  restorePlayerConnection(playerId: string): boolean;
}

// Import shared types for re-export
import type { 
  Room, 
  Player, 
  EstimationRound, 
  EstimationResult,
  ClientEvents,
  ServerEvents,
  CardValue,
  RoomId,
  PlayerId
} from '../shared-types';