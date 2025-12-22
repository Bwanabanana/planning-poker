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
    cards: Map<string, string>;
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
export interface ServerEvents {
    'room-joined': {
        room: Room;
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
export declare const PLANNING_POKER_DECK: readonly ["0.5", "1", "2", "3", "5", "8", "13", "21", "?", "☕"];
export type CardValue = typeof PLANNING_POKER_DECK[number];
export type RoomId = string;
export type PlayerId = string;
export interface SerializableRoom {
    id: string;
    name: string;
    createdAt: string;
    players: Player[];
    currentRound?: SerializableEstimationRound;
}
export interface SerializableEstimationRound {
    cards: Record<string, string>;
    isRevealed: boolean;
    startedAt: string;
}
//# sourceMappingURL=types.d.ts.map