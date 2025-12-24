/**
 * WebSocket event handlers hook
 * Extracts all WebSocket event handling logic from App component
 */

import { useCallback } from 'react';
import type { Room, Player, EstimationResult } from '../types';
import { RoomStateHook, RoundState } from './useRoomState';

interface UIStateActions {
  setIsLoading: (loading: boolean) => void;
  setIsJoining: (joining: boolean) => void;
  setError: (error: string) => void;
  setConnectionError: (error: string) => void;
  setIsReconnecting: (reconnecting: boolean) => void;
  setRetryCount: (count: number | ((prev: number) => number)) => void;
}

interface WebSocketHandlersHook {
  handleRoomJoined: (data: { room: Room; currentPlayer: Player }) => void;
  handlePlayerJoined: (player: Player) => void;
  handlePlayerLeft: (playerId: string) => void;
  handleRoundStarted: () => void;
  handleCardSelected: (playerId: string, hasSelected: boolean) => void;
  handlePlayerSelectionStatus: (players: Array<{
    playerId: string;
    playerName: string;
    hasSelected: boolean;
    isConnected: boolean;
  }>) => void;
  handleAllCardsSubmitted: () => void;
  handleCardsRevealed: (result: EstimationResult) => void;
  handlePlayerRemoved: (playerId: string, playerName: string) => void;
  handleError: (message: string) => void;
  handleConnectionChange: (connected: boolean) => void;
}

export function useWebSocketHandlers(
  roomState: RoomStateHook,
  uiState: UIStateActions,
  isReconnecting: boolean
): WebSocketHandlersHook {
  
  const handleRoomJoined = useCallback((data: { room: Room; currentPlayer: Player }) => {
    console.log('Room joined successfully:', data.room, 'Current player:', data.currentPlayer);
    
    // Call the room state handler
    roomState.handleRoomJoined(data);
    
    // Clear loading states
    uiState.setIsLoading(false);
    uiState.setIsJoining(false);
    uiState.setError('');
    uiState.setConnectionError('');
  }, [roomState, uiState]);

  const handlePlayerJoined = useCallback((player: Player) => {
    console.log('Player joined:', player);
    // Note: We rely on handlePlayerSelectionStatus for authoritative player state
    // This event is mainly for immediate feedback, but the selection status event
    // that follows will provide the definitive player list
    if (roomState.currentRoom) {
      const currentRoom = roomState.currentRoom;
      
      // Check if player already exists (reconnection)
      const existingPlayerIndex = currentRoom.players.findIndex((p: Player) => p.id === player.id);
      
      if (existingPlayerIndex >= 0) {
        // Update existing player
        const updatedPlayers = [...currentRoom.players];
        updatedPlayers[existingPlayerIndex] = player;
        roomState.setCurrentRoom({ ...currentRoom, players: updatedPlayers });
      } else {
        // Add new player
        roomState.setCurrentRoom({ ...currentRoom, players: [...currentRoom.players, player] });
      }
    }
  }, [roomState]);

  const handlePlayerLeft = useCallback((playerId: string) => {
    console.log('Player left:', playerId);
    if (roomState.currentRoom) {
      const currentRoom = roomState.currentRoom;
      
      // Mark player as disconnected instead of removing
      const updatedPlayers = currentRoom.players.map((player: Player) => 
        player.id === playerId 
          ? { ...player, isConnected: false }
          : player
      );
      
      roomState.setCurrentRoom({ ...currentRoom, players: updatedPlayers });
    }
    
    // Remove from selections if they left
    const currentSelections = { ...roomState.playerSelections };
    delete currentSelections[playerId];
    roomState.setPlayerSelections(currentSelections);
  }, [roomState]);

  const handleRoundStarted = useCallback(() => {
    console.log('Round started');
    roomState.setRoundState(RoundState.ACTIVE);
    roomState.setSelectedCard(undefined);
    roomState.setPlayerSelections({});
    roomState.setEstimationResult(null);
    uiState.setError('');
    uiState.setIsLoading(false); // Clear loading state
  }, [roomState, uiState]);

  const handleCardSelected = useCallback((playerId: string, hasSelected: boolean) => {
    console.log('Card selected:', playerId, hasSelected);
    roomState.setPlayerSelections({
      ...roomState.playerSelections,
      [playerId]: hasSelected
    });
  }, [roomState]);

  const handlePlayerSelectionStatus = useCallback((players: Array<{
    playerId: string;
    playerName: string;
    hasSelected: boolean;
    isConnected: boolean;
  }>) => {
    console.log('Player selection status update:', players);
    
    // Update player selections
    const selections: Record<string, boolean> = {};
    players.forEach((player) => {
      selections[player.playerId] = player.hasSelected;
    });
    roomState.setPlayerSelections(selections);
    
    // Update room players with authoritative backend state
    if (roomState.currentRoom) {
      const currentRoom = roomState.currentRoom;
      
      // Use the backend's player list as the authoritative source
      // This ensures we don't have duplicate or stale player entries
      const updatedPlayers = players.map(statusPlayer => {
        // Find existing player data to preserve other fields
        const existingPlayer = currentRoom.players.find((p: Player) => p.id === statusPlayer.playerId);
        
        if (existingPlayer) {
          // Update existing player with backend status
          return {
            ...existingPlayer,
            name: statusPlayer.playerName, // Ensure name is up to date
            isConnected: statusPlayer.isConnected
          };
        } else {
          // Create new player entry (shouldn't happen often, but handles edge cases)
          return {
            id: statusPlayer.playerId,
            name: statusPlayer.playerName,
            isConnected: statusPlayer.isConnected,
            joinedAt: new Date() // Default value
          };
        }
      });
      
      roomState.setCurrentRoom({ ...currentRoom, players: updatedPlayers });
    }
  }, [roomState]);

  const handleAllCardsSubmitted = useCallback(() => {
    console.log('All cards submitted');
    // This is handled by checking playerSelections state
  }, []);

  const handleCardsRevealed = useCallback((result: EstimationResult) => {
    console.log('Cards revealed:', result);
    roomState.setRoundState(RoundState.REVEALED);
    roomState.setEstimationResult(result);
    roomState.setSelectedCard(undefined); // Clear selection after reveal
    uiState.setIsLoading(false); // Clear loading state
  }, [roomState, uiState]);

  const handlePlayerRemoved = useCallback((playerId: string, playerName: string) => {
    console.log('Player removed:', playerId, playerName);
    if (roomState.currentRoom) {
      const currentRoom = roomState.currentRoom;
      
      // Remove the player from the room
      const updatedPlayers = currentRoom.players.filter((player: Player) => player.id !== playerId);
      
      roomState.setCurrentRoom({ ...currentRoom, players: updatedPlayers });
    }
    
    // Remove from selections if they were removed
    const currentSelections = { ...roomState.playerSelections };
    delete currentSelections[playerId];
    roomState.setPlayerSelections(currentSelections);
  }, [roomState]);

  const handleError = useCallback((message: string) => {
    console.error('WebSocket error:', message);
    uiState.setError(message);
    uiState.setIsJoining(false);
    uiState.setIsLoading(false);
    
    // Categorize errors for better user feedback
    if (message.includes('Room not found') || message.includes('Room ID')) {
      uiState.setError('The room you\'re trying to join doesn\'t exist. Please check the room ID and try again.');
    } else if (message.includes('connection') || message.includes('connect')) {
      uiState.setConnectionError(message);
      uiState.setError('Connection issue detected. Please check your internet connection.');
    } else if (message.includes('Player name')) {
      uiState.setError('Please enter a valid player name to continue.');
    } else {
      uiState.setError(message);
    }
  }, [uiState]);

  const handleConnectionChange = useCallback((connected: boolean) => {
    console.log('Connection status changed:', connected);
    if (!connected && roomState.currentRoom) {
      uiState.setIsReconnecting(true);
      uiState.setConnectionError('Connection lost. Attempting to reconnect...');
      uiState.setRetryCount(prev => prev + 1);
    } else if (connected && isReconnecting) {
      uiState.setIsReconnecting(false);
      uiState.setConnectionError('');
      uiState.setRetryCount(0);
      uiState.setError(''); // Clear any connection-related errors
    } else if (connected) {
      uiState.setConnectionError('');
      uiState.setRetryCount(0);
    }
  }, [roomState.currentRoom, isReconnecting, uiState]);

  return {
    handleRoomJoined,
    handlePlayerJoined,
    handlePlayerLeft,
    handleRoundStarted,
    handleCardSelected,
    handlePlayerSelectionStatus,
    handleAllCardsSubmitted,
    handleCardsRevealed,
    handlePlayerRemoved,
    handleError,
    handleConnectionChange
  };
}