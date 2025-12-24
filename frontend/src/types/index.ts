// Re-export shared types
export * from '../../../shared/types';

// Frontend-specific interfaces

export interface RoomManagementProps {
  onRoomCreated?: (room: Room) => void;
  onRoomJoined?: (room: Room) => void;
  onJoinRoom?: (roomId: string, playerName: string) => void;
  isConnected?: boolean;
}

export interface PlanningPokerGameProps {
  room: Room;
  roundState?: string;
}

export interface CardSelectionProps {
  availableCards?: CardValue[];
  selectedCard?: CardValue;
  onCardSelect: (cardValue: CardValue) => void;
  disabled?: boolean;
}

export interface PlayerStatusProps {
  players: Player[];
  cardSelections?: Record<string, boolean>; // playerId -> hasSelected
}

export interface ResultsDisplayProps {
  result: EstimationResult;
  currentPlayerId?: string;
  onCardSelect?: (cardValue: CardValue) => void;
}

// Import shared types for re-export
import type { 
  Room, 
  Player, 
  EstimationResult,
  CardValue
} from '../../../shared/types';