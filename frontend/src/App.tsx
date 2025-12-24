import './App.css';
import './components/components.css';
import {
  AppHeader,
  ErrorBanners,
  LoadingOverlay,
  RoomSelectionView,
  GameView
} from './components';
import { 
  useWebSocket, 
  useRoomState, 
  useUIState,
  useWebSocketHandlers,
  useGameActions,
  AppState, 
  RoundState 
} from './hooks';

function App() {
  // Room state management - extracted to custom hook
  const roomState = useRoomState();
  
  // UI state management - extracted to custom hook
  const uiState = useUIState();
  
  // WebSocket event handlers - extracted to custom hook
  const webSocketHandlers = useWebSocketHandlers(roomState, uiState, uiState.isReconnecting);

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
    onRoomJoined: webSocketHandlers.handleRoomJoined,
    onPlayerJoined: webSocketHandlers.handlePlayerJoined,
    onPlayerLeft: webSocketHandlers.handlePlayerLeft,
    onPlayerRemoved: webSocketHandlers.handlePlayerRemoved,
    onRoundStarted: webSocketHandlers.handleRoundStarted,
    onCardSelected: webSocketHandlers.handleCardSelected,
    onPlayerSelectionStatus: webSocketHandlers.handlePlayerSelectionStatus,
    onAllCardsSubmitted: webSocketHandlers.handleAllCardsSubmitted,
    onCardsRevealed: webSocketHandlers.handleCardsRevealed,
    onError: webSocketHandlers.handleError,
    onConnectionChange: webSocketHandlers.handleConnectionChange
  });

  // Game action handlers - extracted to custom hook
  const gameActions = useGameActions(
    roomState,
    uiState,
    { joinRoom, startRound, selectCard, revealCards, leaveRoom, removePlayer },
    isConnected,
    uiState.isJoining,
    socket
  );

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
      <AppHeader
        isConnected={isConnected}
        isReconnecting={uiState.isReconnecting}
        hasCurrentRoom={Boolean(roomState.currentRoom)}
        onLeaveRoom={gameActions.handleLeaveRoom}
      />

      <main className="main-content">
        <ErrorBanners
          connectionError={uiState.connectionError}
          error={uiState.error}
          retryCount={uiState.retryCount}
          onDismissConnectionError={() => uiState.setConnectionError('')}
          onDismissError={() => uiState.setError('')}
        />

        <LoadingOverlay 
          isVisible={uiState.isLoading}
        />

        {roomState.appState === AppState.ROOM_SELECTION && (
          <RoomSelectionView
            isJoining={uiState.isJoining}
            onRoomCreated={gameActions.handleRoomCreated}
            onRoomJoined={gameActions.handleRoomJoinRequest}
            onJoinRoom={gameActions.handleJoinRoom}
          />
        )}

        {roomState.appState === AppState.IN_ROOM && roomState.currentRoom && (
          <GameView
            currentRoom={roomState.currentRoom}
            roundState={roomState.roundState}
            selectedCard={roomState.selectedCard}
            playerSelections={roomState.playerSelections}
            estimationResult={roomState.estimationResult}
            currentPlayerId={roomState.currentPlayer?.id}
            isConnected={isConnected}
            isReconnecting={uiState.isReconnecting}
            retryCount={uiState.retryCount}
            allPlayersSelected={allPlayersSelected}
            isCardSelectionDisabled={isCardSelectionDisabled}
            onStartRound={gameActions.handleStartRound}
            onCardSelect={gameActions.handleCardSelect}
            onRevealCards={gameActions.handleRevealCards}
            onStartNewRound={gameActions.handleStartNewRound}
            onRemovePlayer={gameActions.handleRemovePlayer}
          />
        )}
      </main>
    </div>
  );
}

export default App;