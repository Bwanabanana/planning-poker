/**
 * Game action handlers hook
 * Extracts game action logic from App component
 */

import { useCallback } from 'react';
import type { Room, CardValue } from '../types';
import { RoomStateHook } from './useRoomState';

interface UIStateActions {
  isJoining: boolean;
  setIsLoading: (loading: boolean) => void;
  setIsJoining: (joining: boolean) => void;
  setError: (error: string) => void;
  setConnectionError: (error: string) => void;
}

interface WebSocketActions {
  joinRoom: (roomId: string, playerName: string) => void;
  startRound: () => void;
  selectCard: (cardValue: CardValue) => void;
  revealCards: () => void;
  removePlayer: (playerId: string) => void;
  leaveRoom: () => void;
}

interface GameActionsHook {
  handleRoomCreated: (room: Room) => Promise<void>;
  handleRoomJoinRequest: (room: Room) => Promise<void>;
  handleJoinRoom: (roomId: string, playerName: string) => void;
  handleStartRound: () => void;
  handleCardSelect: (cardValue: CardValue) => void;
  handleRevealCards: () => void;
  handleStartNewRound: () => void;
  handleRemovePlayer: (playerId: string) => void;
  handleLeaveRoom: () => void;
}

export function useGameActions(
  roomState: RoomStateHook,
  uiState: UIStateActions,
  webSocketActions: WebSocketActions,
  isConnected: boolean,
  isJoining: boolean,
  socket: any
): GameActionsHook {

  // Room management handlers
  const handleRoomCreated = useCallback(async (room: Room) => {
    // For room creation, we need to join the room via WebSocket
    if (roomState.currentPlayer) {
      webSocketActions.joinRoom(room.id, roomState.currentPlayer.name);
    }
  }, [webSocketActions.joinRoom, roomState.currentPlayer]);

  const handleRoomJoinRequest = useCallback(async (room: Room) => {
    // This is called from RoomManagement component
    // We need to extract player name from the form and join via WebSocket
    // The actual joining will be handled by the RoomManagement component
    roomState.setCurrentRoom(room);
  }, [roomState]);

  // WebSocket action handlers
  const handleJoinRoom = useCallback((roomId: string, playerName: string) => {
    uiState.setIsJoining(true);
    uiState.setIsLoading(true);
    uiState.setError('');
    uiState.setConnectionError('');
    roomState.setCurrentPlayer({ id: '', name: playerName }); // ID will be set by server
    
    // Set a timeout for join operation
    const joinTimeout = setTimeout(() => {
      if (uiState.isJoining) {
        uiState.setError('Room join timed out. Please check your connection and try again.');
        uiState.setIsJoining(false);
        uiState.setIsLoading(false);
      }
    }, 10000); // 10 second timeout
    
    // Clear timeout when join completes
    const originalJoinRoom = webSocketActions.joinRoom;
    const wrappedJoinRoom = (...args: Parameters<typeof webSocketActions.joinRoom>) => {
      clearTimeout(joinTimeout);
      return originalJoinRoom(...args);
    };
    
    wrappedJoinRoom(roomId, playerName);
  }, [webSocketActions.joinRoom, isJoining, roomState, uiState]);

  const handleStartRound = useCallback(() => {
    console.log('handleStartRound called, isConnected:', isConnected);
    console.log('WebSocket connected:', socket?.connected);
    
    if (!isConnected) {
      console.log('Not connected, showing error');
      uiState.setError('Cannot start round: Not connected to server. Please wait for connection to be restored.');
      return;
    }
    uiState.setIsLoading(true);
    uiState.setError('');
    
    try {
      console.log('Calling startRound()');
      webSocketActions.startRound();
      // Loading state will be cleared when round-started event is received
    } catch (error) {
      console.error('Error in handleStartRound:', error);
      uiState.setError('Failed to start estimation round. Please try again.');
      uiState.setIsLoading(false);
    }
  }, [webSocketActions.startRound, isConnected, socket, uiState]);

  const handleCardSelect = useCallback((cardValue: CardValue) => {
    if (!isConnected) {
      uiState.setError('Cannot select card: Not connected to server. Please wait for connection to be restored.');
      return;
    }
    
    roomState.setSelectedCard(cardValue);
    try {
      webSocketActions.selectCard(cardValue);
    } catch (error) {
      uiState.setError('Failed to select card. Please try again.');
      roomState.setSelectedCard(undefined); // Reset selection on error
    }
  }, [webSocketActions.selectCard, isConnected, roomState, uiState]);

  const handleRevealCards = useCallback(() => {
    if (!isConnected) {
      uiState.setError('Cannot reveal cards: Not connected to server. Please wait for connection to be restored.');
      return;
    }
    
    uiState.setIsLoading(true);
    uiState.setError('');
    
    try {
      webSocketActions.revealCards();
      // Loading state will be cleared when cards-revealed event is received
    } catch (error) {
      uiState.setError('Failed to reveal cards. Please try again.');
      uiState.setIsLoading(false);
    }
  }, [webSocketActions.revealCards, isConnected, uiState]);

  const handleStartNewRound = useCallback(() => {
    roomState.setEstimationResult(null);
    roomState.setSelectedCard(undefined);
    roomState.setPlayerSelections({});
    webSocketActions.startRound();
  }, [webSocketActions.startRound, roomState]);

  const handleRemovePlayer = useCallback((playerId: string) => {
    if (!isConnected) {
      uiState.setError('Cannot remove player: Not connected to server. Please wait for connection to be restored.');
      return;
    }
    
    try {
      webSocketActions.removePlayer(playerId);
    } catch (error) {
      uiState.setError('Failed to remove player. Please try again.');
    }
  }, [webSocketActions.removePlayer, isConnected, uiState]);

  const handleLeaveRoom = useCallback(() => {
    webSocketActions.leaveRoom(); // Use leaveRoom instead of disconnect to keep socket alive
    roomState.handleLeaveRoom();
    uiState.setError('');
    uiState.setConnectionError('');
    uiState.setIsJoining(false);
    uiState.setIsLoading(false);
  }, [webSocketActions.leaveRoom, roomState, uiState]);

  return {
    handleRoomCreated,
    handleRoomJoinRequest,
    handleJoinRoom,
    handleStartRound,
    handleCardSelect,
    handleRevealCards,
    handleStartNewRound,
    handleRemovePlayer,
    handleLeaveRoom
  };
}