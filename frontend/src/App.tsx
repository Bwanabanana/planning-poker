import { useState, useCallback } from 'react';
import './App.css';
import './components/components.css';
import {
  RoomManagement,
  PlanningPokerGame,
  CardSelection,
  PlayerStatus,
  ResultsDisplay,
  ConnectionStatus
} from './components';
import { useWebSocket } from './hooks/useWebSocket';
import { useRoomState, AppState, RoundState } from './hooks/useRoomState';
import type { 
  Room, 
  Player, 
  EstimationResult, 
  CardValue
} from './types';

function App() {
  // Room state management - extracted to custom hook
  const roomState = useRoomState();
  
  // UI state (not related to room/round state)
  const [error, setError] = useState<string>('');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);

  // WebSocket event handlers - updated to use roomState hook
  const handleRoomJoined = useCallback((data: { room: Room; currentPlayer: Player }) => {
    console.log('Room joined successfully:', data.room, 'Current player:', data.currentPlayer);
    
    // Call the room state handler
    roomState.handleRoomJoined(data);
    
    // Clear loading states
    setIsLoading(false);
    setIsJoining(false);
    setError('');
    setConnectionError('');
  }, [roomState]);

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
    setError('');
    setIsLoading(false); // Clear loading state
  }, [roomState]);

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
    setIsLoading(false); // Clear loading state
  }, [roomState]);

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
    setError(message);
    setIsJoining(false);
    setIsLoading(false);
    
    // Categorize errors for better user feedback
    if (message.includes('Room not found') || message.includes('Room ID')) {
      setError('The room you\'re trying to join doesn\'t exist. Please check the room ID and try again.');
    } else if (message.includes('connection') || message.includes('connect')) {
      setConnectionError(message);
      setError('Connection issue detected. Please check your internet connection.');
    } else if (message.includes('Player name')) {
      setError('Please enter a valid player name to continue.');
    } else {
      setError(message);
    }
  }, []);

  const handleConnectionChange = useCallback((connected: boolean) => {
    console.log('Connection status changed:', connected);
    if (!connected && roomState.currentRoom) {
      setIsReconnecting(true);
      setConnectionError('Connection lost. Attempting to reconnect...');
      setRetryCount(prev => prev + 1);
    } else if (connected && isReconnecting) {
      setIsReconnecting(false);
      setConnectionError('');
      setRetryCount(0);
      setError(''); // Clear any connection-related errors
    } else if (connected) {
      setConnectionError('');
      setRetryCount(0);
    }
  }, [roomState.currentRoom, isReconnecting]);

  // Initialize WebSocket
  const {
    socket,
    isConnected,
    joinRoom,
    startRound,
    selectCard,
    revealCards,
    leaveRoom,
    removePlayer
  } = useWebSocket({
    onRoomJoined: handleRoomJoined,
    onPlayerJoined: handlePlayerJoined,
    onPlayerLeft: handlePlayerLeft,
    onPlayerRemoved: handlePlayerRemoved,
    onRoundStarted: handleRoundStarted,
    onCardSelected: handleCardSelected,
    onPlayerSelectionStatus: handlePlayerSelectionStatus,
    onAllCardsSubmitted: handleAllCardsSubmitted,
    onCardsRevealed: handleCardsRevealed,
    onError: handleError,
    onConnectionChange: handleConnectionChange
  });

  // Room management handlers
  const handleRoomCreated = useCallback(async (room: Room) => {
    // For room creation, we need to join the room via WebSocket
    if (roomState.currentPlayer) {
      joinRoom(room.id, roomState.currentPlayer.name);
    }
  }, [joinRoom, roomState.currentPlayer]);

  const handleRoomJoinRequest = useCallback(async (room: Room) => {
    // This is called from RoomManagement component
    // We need to extract player name from the form and join via WebSocket
    // The actual joining will be handled by the RoomManagement component
    roomState.setCurrentRoom(room);
  }, [roomState]);

  // WebSocket action handlers
  const handleJoinRoom = useCallback((roomId: string, playerName: string) => {
    setIsJoining(true);
    setIsLoading(true);
    setError('');
    setConnectionError('');
    roomState.setCurrentPlayer({ id: '', name: playerName }); // ID will be set by server
    
    // Set a timeout for join operation
    const joinTimeout = setTimeout(() => {
      if (isJoining) {
        setError('Room join timed out. Please check your connection and try again.');
        setIsJoining(false);
        setIsLoading(false);
      }
    }, 10000); // 10 second timeout
    
    // Clear timeout when join completes
    const originalJoinRoom = joinRoom;
    const wrappedJoinRoom = (...args: Parameters<typeof joinRoom>) => {
      clearTimeout(joinTimeout);
      return originalJoinRoom(...args);
    };
    
    wrappedJoinRoom(roomId, playerName);
  }, [joinRoom, isJoining]);

  const handleStartRound = useCallback(() => {
    console.log('handleStartRound called, isConnected:', isConnected);
    console.log('WebSocket connected:', socket?.connected);
    
    if (!isConnected) {
      console.log('Not connected, showing error');
      setError('Cannot start round: Not connected to server. Please wait for connection to be restored.');
      return;
    }
    setIsLoading(true);
    setError('');
    
    try {
      console.log('Calling startRound()');
      startRound();
      // Loading state will be cleared when round-started event is received
    } catch (error) {
      console.error('Error in handleStartRound:', error);
      setError('Failed to start estimation round. Please try again.');
      setIsLoading(false);
    }
  }, [startRound, isConnected, socket]);

  const handleCardSelect = useCallback((cardValue: CardValue) => {
    if (!isConnected) {
      setError('Cannot select card: Not connected to server. Please wait for connection to be restored.');
      return;
    }
    
    roomState.setSelectedCard(cardValue);
    try {
      selectCard(cardValue);
    } catch (error) {
      setError('Failed to select card. Please try again.');
      roomState.setSelectedCard(undefined); // Reset selection on error
    }
  }, [selectCard, isConnected, roomState]);

  const handleRevealCards = useCallback(() => {
    if (!isConnected) {
      setError('Cannot reveal cards: Not connected to server. Please wait for connection to be restored.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      revealCards();
      // Loading state will be cleared when cards-revealed event is received
    } catch (error) {
      setError('Failed to reveal cards. Please try again.');
      setIsLoading(false);
    }
  }, [revealCards, isConnected]);

  const handleStartNewRound = useCallback(() => {
    roomState.setEstimationResult(null);
    roomState.setSelectedCard(undefined);
    roomState.setPlayerSelections({});
    startRound();
  }, [startRound, roomState]);

  const handleRemovePlayer = useCallback((playerId: string) => {
    if (!isConnected) {
      setError('Cannot remove player: Not connected to server. Please wait for connection to be restored.');
      return;
    }
    
    try {
      removePlayer(playerId);
    } catch (error) {
      setError('Failed to remove player. Please try again.');
    }
  }, [removePlayer, isConnected]);

  const handleLeaveRoom = useCallback(() => {
    leaveRoom(); // Use leaveRoom instead of disconnect to keep socket alive
    roomState.handleLeaveRoom();
    setError('');
    setConnectionError('');
    setIsReconnecting(false);
    setIsJoining(false);
    setIsLoading(false);
    setRetryCount(0);
  }, [leaveRoom, roomState]);

  // Check if all connected players have selected cards
  const allPlayersSelected = roomState.currentRoom ? 
    roomState.currentRoom.players
      .filter(p => p.isConnected)
      .every(p => roomState.playerSelections[p.id] === true) &&
    roomState.currentRoom.players.filter(p => p.isConnected).length > 0
    : false;

  // Determine if card selection should be disabled
  const isCardSelectionDisabled = roomState.roundState !== RoundState.ACTIVE || !isConnected;

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div className="header-title">
            <h1>Planning Poker System</h1>
            <p>Real-time collaborative story point estimation</p>
          </div>
          <div className="header-status">
            <ConnectionStatus 
              isConnected={isConnected} 
              isReconnecting={isReconnecting}
            />
            {roomState.currentRoom && (
              <button 
                onClick={handleLeaveRoom}
                className="btn btn-secondary btn-small"
              >
                Leave Room
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="main-content">
        {/* Connection Error Banner */}
        {connectionError && (
          <div className="connection-error-banner" role="alert">
            <span className="error-icon">🔌</span>
            <span className="error-message">{connectionError}</span>
            {retryCount > 0 && (
              <span className="retry-count">Attempt {retryCount}</span>
            )}
            <button 
              onClick={() => setConnectionError('')}
              className="error-dismiss"
              aria-label="Dismiss connection error"
            >
              ×
            </button>
          </div>
        )}

        {/* General Error Banner */}
        {error && !connectionError && (
          <div className="error-banner" role="alert">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{error}</span>
            <button 
              onClick={() => setError('')}
              className="error-dismiss"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Processing...</p>
            </div>
          </div>
        )}

        {roomState.appState === AppState.ROOM_SELECTION && (
          <div className="room-selection-view">
            {isJoining && (
              <div className="loading-overlay">
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  <p>Joining room...</p>
                </div>
              </div>
            )}
            <RoomManagement
              onRoomCreated={handleRoomCreated}
              onRoomJoined={handleRoomJoinRequest}
              onJoinRoom={handleJoinRoom}
            />
          </div>
        )}

        {roomState.appState === AppState.IN_ROOM && roomState.currentRoom && (
          <div className="game-view">
            {/* Reconnection Banner */}
            {isReconnecting && (
              <div className="reconnection-banner">
                <span className="reconnection-icon">🔄</span>
                <span>Connection lost. Attempting to reconnect...</span>
                {retryCount > 0 && (
                  <span className="retry-info">Attempt {retryCount}</span>
                )}
              </div>
            )}

            {/* Connection Status Warning */}
            {!isConnected && !isReconnecting && (
              <div className="connection-warning-banner">
                <span className="warning-icon">⚠️</span>
                <span>You are currently offline. Some features may not work properly.</span>
              </div>
            )}
            
            <div className="game-layout">
              {/* Main game area */}
              <div className="game-main">
                {/* Card selection - show prominently at the top during active rounds */}
                {roomState.roundState === RoundState.ACTIVE && (
                  <div className="card-selection-area">
                    <CardSelection
                      selectedCard={roomState.selectedCard}
                      onCardSelect={handleCardSelect}
                      disabled={isCardSelectionDisabled}
                    />
                  </div>
                )}

                {roomState.roundState === RoundState.REVEALED && roomState.estimationResult ? (
                  <ResultsDisplay
                    result={roomState.estimationResult}
                    currentPlayerId={roomState.currentPlayer?.id}
                    onCardSelect={handleCardSelect}
                  />
                ) : (
                  <PlanningPokerGame
                    room={roomState.currentRoom}
                    roundState={roomState.roundState}
                  />
                )}
              </div>

              {/* Sidebar with room info and player status */}
              <div className="game-sidebar">
                <div className="room-header">
                  <h2>{roomState.currentRoom.name}</h2>
                  
                  {/* Round control buttons */}
                  <div className="room-controls">
                    {roomState.roundState === 'waiting' && (
                      <button 
                        onClick={handleStartRound}
                        className="btn btn-primary btn-large"
                        disabled={roomState.currentRoom.players.filter(p => p.isConnected).length === 0}
                      >
                        Start New Round
                      </button>
                    )}
                    
                    {roomState.roundState === 'active' && (
                      <>
                        <button 
                          onClick={handleRevealCards}
                          className={`btn ${allPlayersSelected ? 'btn-success' : 'btn-secondary'} btn-large`}
                          disabled={!allPlayersSelected}
                          title={allPlayersSelected ? 'Reveal all cards' : 'Waiting for all players to select cards'}
                        >
                          {allPlayersSelected ? 'Reveal Cards' : 'Waiting for All Players...'}
                        </button>
                        
                        <button 
                          onClick={handleStartNewRound}
                          className="btn btn-outline-primary btn-large"
                          style={{ marginTop: '0.5rem' }}
                        >
                          Start New Round
                        </button>
                      </>
                    )}
                    
                    {roomState.roundState === 'revealed' && (
                      <button 
                        onClick={handleStartNewRound}
                        className="btn btn-primary btn-large"
                      >
                        Start New Round
                      </button>
                    )}
                  </div>
                </div>
                
                <PlayerStatus
                  players={roomState.currentRoom.players}
                  cardSelections={roomState.playerSelections}
                  roundState={roomState.roundState}
                  onRemovePlayer={handleRemovePlayer}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;