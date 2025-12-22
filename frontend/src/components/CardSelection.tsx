import React from 'react';
import { CardValue, CardSelectionProps } from '../types';

// Use the constant directly since it's re-exported from shared types
const PLANNING_POKER_DECK: readonly CardValue[] = ['0.5', '1', '2', '3', '5', '8', '13', '21', '?', '☕'];

const CardSelection: React.FC<CardSelectionProps> = ({
  availableCards = PLANNING_POKER_DECK,
  selectedCard,
  onCardSelect,
  disabled = false
}) => {
  const handleCardClick = (cardValue: CardValue) => {
    if (!disabled) {
      onCardSelect(cardValue);
    }
  };

  const getCardDisplayValue = (cardValue: CardValue): string => {
    // Handle special cards with better display
    switch (cardValue) {
      case '?':
        return '?';
      case '☕':
        return '☕';
      default:
        return cardValue;
    }
  };

  const getCardClassName = (cardValue: CardValue): string => {
    const baseClass = 'planning-card';
    const isSelected = selectedCard === cardValue;
    const isSpecial = cardValue === '?' || cardValue === '☕';
    
    let className = baseClass;
    
    if (isSelected) {
      className += ' selected';
    }
    
    if (disabled) {
      className += ' disabled';
    }
    
    if (isSpecial) {
      className += ' special-card';
    }
    
    return className;
  };

  const getCardTitle = (cardValue: CardValue): string => {
    switch (cardValue) {
      case '?':
        return 'Unknown/Need more info';
      case '☕':
        return 'Break/Too complex';
      default:
        return `${cardValue} story points`;
    }
  };

  return (
    <div className="card-selection">
      <div className="card-selection__header">
        <h3>Select Your Estimate</h3>
      </div>

      <div className="cards-container">
        <div className="cards-deck">
          {availableCards.map((cardValue) => (
            <button
              key={cardValue}
              className={getCardClassName(cardValue)}
              onClick={() => handleCardClick(cardValue)}
              disabled={disabled}
              title={getCardTitle(cardValue)}
              aria-label={`Select ${getCardTitle(cardValue)}`}
              aria-pressed={selectedCard === cardValue}
            >
              <div className="card-face">
                <div className="card-value">
                  {getCardDisplayValue(cardValue)}
                </div>
                <div className="card-corner top-left">
                  {getCardDisplayValue(cardValue)}
                </div>
                <div className="card-corner bottom-right">
                  {getCardDisplayValue(cardValue)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="card-selection__footer">
        {disabled && (
          <p className="disabled-message">
            Card selection is currently disabled
          </p>
        )}
        {!disabled && !selectedCard && (
          <p className="instruction-message">
            Choose a card to estimate the story points
          </p>
        )}
        {!disabled && selectedCard && (
          <p className="confirmation-message">
            You can change your selection until cards are revealed
          </p>
        )}
      </div>

      <div className="deck-legend">
        <div className="legend-item">
          <span className="legend-symbol">?</span>
          <span className="legend-text">Need more information</span>
        </div>
        <div className="legend-item">
          <span className="legend-symbol">☕</span>
          <span className="legend-text">Too complex / Take a break</span>
        </div>
      </div>
    </div>
  );
};

export default CardSelection;