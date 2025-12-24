/**
 * Room state management hook
 * Extracts room-related state logic from App component
 */

import { useState, useCallback } from 'react';
import type { Room, Player, EstimationResult, CardValue } from '../types';

// Application state enum
export enum AppState {
  ROOM_SELECTION = 'room_selection',
  IN_ROOM = 'in_room'
}

// Round state enum
export enum RoundState {
  WAITING = 'waiting',
  ACTIVE = 'active',
  REVEALED = 'revealed'
}

export interface RoomStateHook {
  // State
  appState: AppState;
  currentRoom: Room | null;
  currentPlayer: { id: string; name: string } | null;
  roundState: RoundState;
  selectedCard: CardValue | undefined;
  playerSelections: Record<string, boolean>;
  estimationResult: EstimationResult | null;
  
  // Actions
  setAppState: (state: AppState) => void;
  setCurrentRoom: (room: Room | null) => void;
  setCurrentPlayer: (player: { id: string; name: string } | null) => void;
  setRoundState: (state: RoundState) => void;
  setSelectedCard: (card: CardValue | undefined) => void;
  setPlayerSelections: (selections: Record<string, boolean>) => void;
  setEstimationResult: (result: EstimationResult | null) => void;
  
  // Computed
  isInRoom: boolean;
  isWaiting: boolean;
  isActive: boolean;
  isRevealed: boolean;
  
  // Complex actions
  handleRoomJoined: (data: { room: Room; currentPlayer: Player }) => void;
  handleLeaveRoom: () => void;
  resetRoomState: () => void;
}

export function useRoomState(): RoomStateHook {
  // Core state
  const [appState, setAppState] = useState<AppState>(AppState.ROOM_SELECTION);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<{ id: string; name: string } | null>(null);
  
  // Round state
  const [roundState, setRoundState] = useState<RoundState>(RoundState.WAITING);
  const [selectedCard, setSelectedCard] = useState<CardValue | undefined>(undefined);
  const [playerSelections, setPlayerSelections] = useState<Record<string, boolean>>({});
  const [estimationResult, setEstimationResult] = useState<EstimationResult | null>(null);
  
  // Computed values
  const isInRoom = appState === AppState.IN_ROOM;
  const isWaiting = roundState === RoundState.WAITING;
  const isActive = roundState === RoundState.ACTIVE;
  const isRevealed = roundState === RoundState.REVEALED;
  
  // Complex actions
  const handleRoomJoined = useCallback((data: { room: Room; currentPlayer: Player }) => {
    console.log('Room joined:', data.room, 'Current player:', data.currentPlayer);
    setCurrentRoom(data.room);
    setCurrentPlayer({ id: data.currentPlayer.id, name: data.currentPlayer.name });
    setAppState(AppState.IN_ROOM);
    
    // Set round state based on current room state
    if (data.room.currentRound) {
      if (data.room.currentRound.isRevealed) {
        setRoundState(RoundState.REVEALED);
      } else {
        setRoundState(RoundState.ACTIVE);
      }
    } else {
      setRoundState(RoundState.WAITING);
    }
    
    // Reset round-specific state
    setSelectedCard(undefined);
    setPlayerSelections({});
    setEstimationResult(null);
  }, []);
  
  const handleLeaveRoom = useCallback(() => {
    setAppState(AppState.ROOM_SELECTION);
    setCurrentRoom(null);
    setCurrentPlayer(null);
    resetRoundState();
  }, []);
  
  const resetRoomState = useCallback(() => {
    setAppState(AppState.ROOM_SELECTION);
    setCurrentRoom(null);
    setCurrentPlayer(null);
    resetRoundState();
  }, []);
  
  const resetRoundState = useCallback(() => {
    setRoundState(RoundState.WAITING);
    setSelectedCard(undefined);
    setPlayerSelections({});
    setEstimationResult(null);
  }, []);
  
  return {
    // State
    appState,
    currentRoom,
    currentPlayer,
    roundState,
    selectedCard,
    playerSelections,
    estimationResult,
    
    // Actions
    setAppState,
    setCurrentRoom,
    setCurrentPlayer,
    setRoundState,
    setSelectedCard,
    setPlayerSelections,
    setEstimationResult,
    
    // Computed
    isInRoom,
    isWaiting,
    isActive,
    isRevealed,
    
    // Complex actions
    handleRoomJoined,
    handleLeaveRoom,
    resetRoomState
  };
}