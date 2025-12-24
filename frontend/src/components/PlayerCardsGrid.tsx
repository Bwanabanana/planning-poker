import React from 'react';
import { EstimationResult } from '../types';

interface PlayerCardsGridProps {
  result: EstimationResult;
  currentPlayerId?: string;
  onCardClick: (playerId: string, cardValue: string) => void;
}

const PlayerCardsGrid: React.FC<PlayerCardsGridProps> = ({
  result,
  currentPlayerId,
  onCardClick
}) => {
  const getCardValueClassName = (cardValue: string) => {
    let className = 'card-value';
    
    // Add special styling for non-numeric cards
    if (cardValue === '?' || cardValue === '☕') {
      className += ' special-card';
    }
    
    return className;
  };

  return (
    <div className="player-cards-section">
      <h4>Player Cards</h4>
      <div className="revealed-cards-grid">
        {result.cards.map((card) => {
          const isCurrentPlayer = card.playerId === currentPlayerId;
          const canAdjust = isCurrentPlayer;
          
          return (
            <div key={card.playerId} className="player-card-result">
              <div className="player-name">{card.playerName}</div>
              <div 
                className={`${getCardValueClassName(card.cardValue)} ${canAdjust ? 'adjustable' : ''}`}
                onClick={() => onCardClick(card.playerId, card.cardValue)}
                style={{ cursor: canAdjust ? 'pointer' : 'default' }}
                title={canAdjust ? 'Click to adjust your estimate' : ''}
              >
                <div className="card-face">
                  <div className="card-value-display">
                    {card.cardValue}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerCardsGrid;