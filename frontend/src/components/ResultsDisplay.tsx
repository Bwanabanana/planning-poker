import React, { useState } from 'react';
import { ResultsDisplayProps, CardValue } from '../types';
import CardSelection from './CardSelection';

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  result,
  currentPlayerId,
  onCardSelect
}) => {
  const [showCardSelection, setShowCardSelection] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardValue | undefined>(undefined);

  // Handle clicking on a player's card (only allow current player to adjust their own card)
  const handleCardClick = (playerId: string, currentCardValue: string) => {
    if (playerId === currentPlayerId && onCardSelect) {
      setSelectedCard(currentCardValue as CardValue);
      setShowCardSelection(true);
    }
  };

  // Handle selecting a new card value
  const handleCardSelect = (cardValue: CardValue) => {
    if (onCardSelect) {
      onCardSelect(cardValue);
    }
    setShowCardSelection(false);
    setSelectedCard(undefined);
  };

  // Handle closing the card selection modal
  const handleCloseModal = () => {
    setShowCardSelection(false);
    setSelectedCard(undefined);
  };
  // Group cards by value for pie chart data
  const getCardDistribution = () => {
    const distribution: Record<string, number> = {};
    
    result.cards.forEach(card => {
      const value = card.cardValue;
      distribution[value] = (distribution[value] || 0) + 1;
    });
    
    return Object.entries(distribution).map(([value, count]) => ({
      value,
      count,
      percentage: (count / result.cards.length) * 100
    }));
  };

  const cardDistribution = getCardDistribution();

  // Generate colors for pie chart segments
  const getSegmentColor = (index: number) => {
    const colors = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Yellow
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#F97316', // Orange
      '#06B6D4', // Cyan
      '#84CC16', // Lime
      '#EC4899', // Pink
      '#6B7280'  // Gray
    ];
    return colors[index % colors.length];
  };

  // Create pie chart segments
  const createPieChart = () => {
    // Special case: if there's only one segment (100% consensus), draw a full circle
    if (cardDistribution.length === 1) {
      return (
        <circle
          cx="50"
          cy="50"
          r="45"
          fill={getSegmentColor(0)}
          stroke="#ffffff"
          strokeWidth="1"
        />
      );
    }

    let cumulativePercentage = 0;
    
    return cardDistribution.map((segment, index) => {
      const startAngle = cumulativePercentage * 3.6; // Convert percentage to degrees
      const endAngle = (cumulativePercentage + segment.percentage) * 3.6;
      cumulativePercentage += segment.percentage;
      
      // Calculate path for SVG arc
      const radius = 45;
      const centerX = 50;
      const centerY = 50;
      
      const startAngleRad = (startAngle - 90) * (Math.PI / 180);
      const endAngleRad = (endAngle - 90) * (Math.PI / 180);
      
      const x1 = centerX + radius * Math.cos(startAngleRad);
      const y1 = centerY + radius * Math.sin(startAngleRad);
      const x2 = centerX + radius * Math.cos(endAngleRad);
      const y2 = centerY + radius * Math.sin(endAngleRad);
      
      const largeArcFlag = segment.percentage > 50 ? 1 : 0;
      
      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');
      
      return (
        <path
          key={segment.value}
          d={pathData}
          fill={getSegmentColor(index)}
          stroke="#ffffff"
          strokeWidth="1"
        />
      );
    });
  };

  const getCardValueClassName = (cardValue: string) => {
    let className = 'card-value';
    
    // Add special styling for non-numeric cards
    if (cardValue === '?' || cardValue === '☕') {
      className += ' special-card';
    }
    
    return className;
  };

  return (
    <div className="results-display">
      <div className="results-header">
        <h3>Estimation Results</h3>
        {result.statistics.hasVariance && (
          <div className="variance-alert">
            <span className="alert-icon">⚠️</span>
            <span className="alert-text">
              Significant variance detected - consider discussion
            </span>
          </div>
        )}
      </div>

      <div className="results-content">
        {/* Pie Chart Section */}
        <div className="chart-section">
          <h4>Distribution</h4>
          <div className="pie-chart-container">
            <svg viewBox="0 0 100 100" className="pie-chart">
              {createPieChart()}
            </svg>
            <div className="chart-legend">
              {cardDistribution.map((segment, index) => (
                <div key={segment.value} className="legend-item">
                  <div 
                    className="legend-color"
                    style={{ backgroundColor: getSegmentColor(index) }}
                  />
                  <span className="legend-label">
                    {segment.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Player Cards Section */}
        <div className="player-cards-section">
          <h4>Player Cards</h4>
          <div className="revealed-cards-grid">
            {result.cards.map((card) => {
              const isCurrentPlayer = card.playerId === currentPlayerId;
              const canAdjust = isCurrentPlayer && onCardSelect;
              
              return (
                <div key={card.playerId} className="player-card-result">
                  <div className="player-name">{card.playerName}</div>
                  <div 
                    className={`${getCardValueClassName(card.cardValue)} ${canAdjust ? 'adjustable' : ''}`}
                    onClick={() => handleCardClick(card.playerId, card.cardValue)}
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
      </div>

      {/* Card Selection Modal */}
      {showCardSelection && (
        <div className="card-selection-modal">
          <div className="modal-backdrop" onClick={handleCloseModal} />
          <div className="modal-content">
            <div className="modal-header">
              <h3>Adjust Your Estimate</h3>
              <button 
                className="close-button" 
                onClick={handleCloseModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <CardSelection
                selectedCard={selectedCard}
                onCardSelect={handleCardSelect}
                disabled={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsDisplay;