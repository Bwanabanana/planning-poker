import React from 'react';
import {
  PlanningPokerGame,
  CardSelection,
  PlayerStatus,
  ResultsDisplay
} from './';
import { RoundState } from '../hooks/useRoomState';
import type { Room, EstimationResult, CardValue } from '../types';

interface GameViewProps {
  // Room state
  currentRoom: Room;
  roundState: RoundState;
  selectedCard?: CardValue;
  playerSelections: Record<string, boolean>;
  estimationResult: EstimationResult | null;
  currentPlayerId?: string;
  
  // Connection state
  isConnected: boolean;
  isReconnecting: boolean;
  retryCount: number;
  
  // Computed values
  allPlayersSelected: boolean;
  isCardSelectionDisabled: boolean;
  
  // Actions
  onStartRound: () => void;
  onCardSelect: (cardValue: CardValue) => void;
  onRevealCards: () => void;
  onStartNewRound: () => void;
  onRemovePlayer: (playerId: string) => void;
}

const GameView: React.FC<GameViewProps> = ({
  currentRoom,
  roundState,
  selectedCard,
  playerSelections,
  estimationResult,
  currentPlayerId,
  isConnected,
  isReconnecting,
  retryCount,
  allPlayersSelected,
  isCardSelectionDisabled,
  onStartRound,
  onCardSelect,
  onRevealCards,
  onStartNewRound,
  onRemovePlayer
}) => {
  return (
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
                onCardSelect={onCardSelect}
                disabled={isCardSelectionDisabled}
              />
            </div>
          )}

          {roundState === RoundState.REVEALED && estimationResult ? (
            <ResultsDisplay
              result={estimationResult}
              currentPlayerId={currentPlayerId}
              onCardSelect={onCardSelect}
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
              {roundState === RoundState.WAITING && (
                <button 
                  onClick={onStartRound}
                  className="btn btn-primary btn-large"
                  disabled={currentRoom.players.filter(p => p.isConnected).length === 0}
                >
                  Start New Round
                </button>
              )}
              
              {roundState === RoundState.ACTIVE && (
                <>
                  <button 
                    onClick={onRevealCards}
                    className={`btn ${allPlayersSelected ? 'btn-success' : 'btn-secondary'} btn-large`}
                    disabled={!allPlayersSelected}
                    title={allPlayersSelected ? 'Reveal all cards' : 'Waiting for all players to select cards'}
                  >
                    {allPlayersSelected ? 'Reveal Cards' : 'Waiting for All Players...'}
                  </button>
                  
                  <button 
                    onClick={onStartNewRound}
                    className="btn btn-outline-primary btn-large"
                    style={{ marginTop: '0.5rem' }}
                  >
                    Start New Round
                  </button>
                </>
              )}
              
              {roundState === RoundState.REVEALED && (
                <button 
                  onClick={onStartNewRound}
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
            onRemovePlayer={onRemovePlayer}
          />
        </div>
      </div>
    </div>
  );
};

export default GameView;