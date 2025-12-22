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
import type { 
  Room, 
  Player, 
  EstimationResult, 
  CardValue
} from './types';

// Application state enum
enum AppState {
  ROOM_SELECTION = 'room_selection',
  IN_ROOM = 'in_room'
}

// Round state enum
enum RoundState {
  WAITING = 'waiting',
  ACTIVE = 'active',
  REVEALED = 'revealed'
}

function App() {
  // Application state
  const [appState, setAppState] = useState<AppState>(AppState.ROOM_SELECTION);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<{ id: string; name: string } | null>(null);
  
  // Round state
  const [roundState, setRoundState] = useState<RoundState>(RoundState.WAITING);
  const [selectedCard, setSelectedCard] = useState<CardValue | undefined>(undefined);
  const [playerSelections, setPlayerSelections] = useState<Record<string, boolean>>({});
  const [estimationResult, setEstimationResult] = useState<EstimationResult | null>(null);
  
  // UI state
  const [error, setError] = useState<string>('');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);

  // WebSocket event handlers
  const handleRoomJoined = useCallback((room: Room) => {
    console.log('Room joined:', room);
    setCurrentRoom(room);
    setAppState(AppState.IN_ROOM);
    setError('');
    setConnectionError('');
    setIsJoining(false);
    setIsLoading(false);
    
    // Set round state based on current room state
    if (room.currentRound) {
      if (room.currentRound.isRevealed) {
        setRoundState(RoundState.REVEALED);
      } else {
        setRoundState(RoundState.ACTIVE);
      }
    } else {
      setRoundState(RoundState.WAITING);
    }
    
    setSelectedCard(undefined);
    setPlayerSelections({});
    setEstimationResult(null);
  }, []);

  const handlePlayerJoined = useCallback((player: Player) => {
    console.log('Player joined:', player);
    // Note: We rely on handlePlayerSelectionStatus for authoritative player state
    // This event is mainly for immediate feedback, but the selection status event
    // that follows will provide the definitive player list
    setCurrentRoom(prev => {
      if (!prev) return prev;
      
      // Check if player already exists (reconnection)
      const existingPlayerIndex = prev.players.findIndex(p => p.id === player.id);
      
      if (existingPlayerIndex >= 0) {
        // Update existing player
        const updatedPlayers = [...prev.players];
        updatedPlayers[existingPlayerIndex] = player;
        return { ...prev, players: updatedPlayers };
      } else {
        // Add new player
        return { ...prev, players: [...prev.players, player] };
      }
    });
  }, []);

  const handlePlayerLeft = useCallback((playerId: string) => {
    console.log('Player left:', playerId);
    setCurrentRoom(prev => {
      if (!prev) return prev;
      
      // Mark player as disconnected instead of removing
      const updatedPlayers = prev.players.map(player => 
        player.id === playerId 
          ? { ...player, isConnected: false }
          : player
      );
      
      return { ...prev, players: updatedPlayers };
    });
    
    // Remove from selections if they left
    setPlayerSelections(prev => {
      const updated = { ...prev };
      delete updated[playerId];
      return updated;
    });
  }, []);

  const handleRoundStarted = useCallback(() => {
    console.log('Round started');
    setRoundState(RoundState.ACTIVE);
    setSelectedCard(undefined);
    setPlayerSelections({});
    setEstimationResult(null);
    setError('');
    setIsLoading(false); // Clear loading state
  }, []);

  const handleCardSelected = useCallback((playerId: string, hasSelected: boolean) => {
    console.log('Card selected:', playerId, hasSelected);
    setPlayerSelections(prev => ({
      ...prev,
      [playerId]: hasSelected
    }));
  }, []);

  const handlePlayerSelectionStatus = useCallback((players: Array<{
    playerId: string;
    playerName: string;
    hasSelected: boolean;
    isConnected: boolean;
  }>) => {
    console.log('Player selection status update:', players);
    
    // Update player selections
    const selections: Record<string, boolean> = {};
    players.forEach(player => {
      selections[player.playerId] = player.hasSelected;
    });
    setPlayerSelections(selections);
    
    // Update room players with authoritative backend state
    setCurrentRoom(prev => {
      if (!prev) return prev;
      
      // Use the backend's player list as the authoritative source
      // This ensures we don't have duplicate or stale player entries
      const updatedPlayers = players.map(statusPlayer => {
        // Find existing player data to preserve other fields
        const existingPlayer = prev.players.find(p => p.id === statusPlayer.playerId);
        
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
      
      return { ...prev, players: updatedPlayers };
    });
  }, []);

  const handleAllCardsSubmitted = useCallback(() => {
    console.log('All cards submitted');
    // This is handled by checking playerSelections state
  }, []);

  const handleCardsRevealed = useCallback((result: EstimationResult) => {
    console.log('Cards revealed:', result);
    setRoundState(RoundState.REVEALED);
    setEstimationResult(result);
    setSelectedCard(undefined); // Clear selection after reveal
    setIsLoading(false); // Clear loading state
  }, []);

  const handlePlayerRemoved = useCallback((playerId: string, playerName: string) => {
    console.log('Player removed:', playerId, playerName);
    setCurrentRoom(prev => {
      if (!prev) return prev;
      
      // Remove the player from the room
      const updatedPlayers = prev.players.filter(player => player.id !== playerId);
      
      return { ...prev, players: updatedPlayers };
    });
    
    // Remove from selections if they were removed
    setPlayerSelections(prev => {
      const updated = { ...prev };
      delete updated[playerId];
      return updated;
    });
  }, []);

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
    if (!connected && currentRoom) {
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
  }, [currentRoom, isReconnecting]);

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
    if (currentPlayer) {
      joinRoom(room.id, currentPlayer.name);
    }
  }, [joinRoom, currentPlayer]);

  const handleRoomJoinRequest = useCallback(async (room: Room) => {
    // This is called from RoomManagement component
    // We need to extract player name from the form and join via WebSocket
    // The actual joining will be handled by the RoomManagement component
    setCurrentRoom(room);
  }, []);

  // WebSocket action handlers
  const handleJoinRoom = useCallback((roomId: string, playerName: string) => {
    setIsJoining(true);
    setIsLoading(true);
    setError('');
    setConnectionError('');
    setCurrentPlayer({ id: '', name: playerName }); // ID will be set by server
    
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
    
    setSelectedCard(cardValue);
    try {
      selectCard(cardValue);
    } catch (error) {
      setError('Failed to select card. Please try again.');
      setSelectedCard(undefined); // Reset selection on error
    }
  }, [selectCard, isConnected]);

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
    setEstimationResult(null);
    setSelectedCard(undefined);
    setPlayerSelections({});
    startRound();
  }, [startRound]);

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
    setAppState(AppState.ROOM_SELECTION);
    setCurrentRoom(null);
    setCurrentPlayer(null);
    setRoundState(RoundState.WAITING);
    setSelectedCard(undefined);
    setPlayerSelections({});
    setEstimationResult(null);
    setError('');
    setConnectionError('');
    setIsReconnecting(false);
    setIsJoining(false);
    setIsLoading(false);
    setRetryCount(0);
  }, [leaveRoom]);

  // Check if all connected players have selected cards
  const allPlayersSelected = currentRoom ? 
    currentRoom.players
      .filter(p => p.isConnected)
      .every(p => playerSelections[p.id] === true) &&
    currentRoom.players.filter(p => p.isConnected).length > 0
    : false;

  // Determine if card selection should be disabled
  const isCardSelectionDisabled = roundState !== RoundState.ACTIVE || !isConnected;

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
            {currentRoom && (
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

        {appState === AppState.ROOM_SELECTION && (
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

        {appState === AppState.IN_ROOM && currentRoom && (
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
                {roundState === RoundState.ACTIVE && (
                  <div className="card-selection-area">
                    <CardSelection
                      selectedCard={selectedCard}
                      onCardSelect={handleCardSelect}
                      disabled={isCardSelectionDisabled}
                    />
                  </div>
                )}

                {roundState === RoundState.REVEALED && estimationResult ? (
                  <ResultsDisplay
                    result={estimationResult}
                  />
                ) : (
                  <PlanningPokerGame
                    room={currentRoom}
                    roundState={roundState}
                  />
                )}
              </div>

              {/* Sidebar with room info and player status */}
              <div className="game-sidebar">
                <div className="room-header">
                  <h2>{currentRoom.name}</h2>
                  
                  {/* Round control buttons */}
                  <div className="room-controls">
                    {roundState === 'waiting' && (
                      <button 
                        onClick={handleStartRound}
                        className="btn btn-primary btn-large"
                        disabled={currentRoom.players.filter(p => p.isConnected).length === 0}
                      >
                        Start New Round
                      </button>
                    )}
                    
                    {roundState === 'active' && (
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
                    
                    {roundState === 'revealed' && (
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
                  players={currentRoom.players}
                  cardSelections={playerSelections}
                  roundState={roundState}
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