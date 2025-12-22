import React from 'react';
import { PlanningPokerGameProps } from '../types';

const PlanningPokerGame: React.FC<PlanningPokerGameProps> = ({
  room,
  roundState = 'waiting'
}) => {
  const isRoundActive = roundState === 'active';
  const isRoundRevealed = roundState === 'revealed';

  const getTotalPlayers = () => {
    return room.players.filter(p => p.isConnected).length;
  };

  return (
    <div className="planning-poker-game">
      <div className="game-content">
        {!isRoundActive && !isRoundRevealed && (
          <div className="waiting-state">
            <div className="waiting-message">
              <h3>Ready to Start a New Round?</h3>
              <p>Use the "Start New Round" button in the sidebar to begin.</p>
              {getTotalPlayers() === 0 && (
                <p className="warning">Waiting for players to join...</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanningPokerGame;