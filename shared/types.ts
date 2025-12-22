// Core domain interfaces for Planning Poker System

export interface Room {
  id: string;
  name: string;
  createdAt: Date;
  players: Player[];
  currentRound?: EstimationRound;
}

export interface Player {
  id: string;
  name: string;
  isConnected: boolean;
  joinedAt: Date;
}

export interface EstimationRound {
  cards: Map<string, string>; // playerId -> cardValue
  isRevealed: boolean;
  startedAt: Date;
}

export interface EstimationResult {
  cards: Array<{
    playerId: string;
    playerName: string;
    cardValue: string;
  }>;
  statistics: {
    average: number;
    median: string;
    range: string[];
    hasVariance: boolean;
  };
}

// WebSocket Communication Interfaces

// Client to Server Events
export interface ClientEvents {
  'join-room': {
    roomId: string;
    playerName: string;
  };
  'start-round': {};
  'select-card': {
    cardValue: string;
  };
  'reveal-cards': {};
}

// Server to Client Events
export interface ServerEvents {
  'room-joined': {
    room: Room;
    currentPlayer: Player;
  };
  'player-joined': {
    player: Player;
  };
  'player-left': {
    playerId: string;
  };
  'round-started': {};
  'card-selected': {
    playerId: string;
    hasSelected: boolean;
  };
  'cards-revealed': {
    result: EstimationResult;
  };
  'error': {
    message: string;
  };
}

// Planning Poker Constants
export const PLANNING_POKER_DECK = ['0.5', '1', '2', '3', '5', '8', '13', '21', '?', '☕'] as const;
export type CardValue = typeof PLANNING_POKER_DECK[number];

// Utility types for type safety
export type RoomId = string;
export type PlayerId = string;

// Room state for serialization (converts Map to object)
export interface SerializableRoom {
  id: string;
  name: string;
  createdAt: string; // ISO string
  players: Player[];
  currentRound?: SerializableEstimationRound;
}

export interface SerializableEstimationRound {
  cards: Record<string, string>; // playerId -> cardValue as object
  isRevealed: boolean;
  startedAt: string; // ISO string
}