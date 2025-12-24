import React, { useState } from 'react';
import { ResultsDisplayProps, CardValue } from '../types';
import { hasConsensus } from '../utils/consensus';
import { getPhraseForResults } from '../utils/phrases';
import { getCardDistribution } from '../utils/card-distribution';
import ResultsHeader from './ResultsHeader';
import PieChart from './PieChart';
import PlayerCardsGrid from './PlayerCardsGrid';
import CardSelectionModal from './CardSelectionModal';

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  result,
  currentPlayerId,
  onCardSelect
}) => {
  const [showCardSelection, setShowCardSelection] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardValue | undefined>(undefined);

  // Business logic - moved to utilities
  const consensusState = hasConsensus(result);
  const currentPhrase = getPhraseForResults(consensusState);
  const cardDistribution = getCardDistribution(result);

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

  return (
    <div className="results-display">
      <ResultsHeader 
        phrase={currentPhrase}
        hasConsensus={consensusState}
        result={result}
      />

      <div className="results-content">
        <PieChart cardDistribution={cardDistribution} />
        
        <PlayerCardsGrid
          result={result}
          currentPlayerId={currentPlayerId}
          onCardClick={handleCardClick}
        />
      </div>

      <CardSelectionModal
        isOpen={showCardSelection}
        selectedCard={selectedCard}
        onCardSelect={handleCardSelect}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default ResultsDisplay;