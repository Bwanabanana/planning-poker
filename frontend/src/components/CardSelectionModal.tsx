import React from 'react';
import { CardValue } from '../types';
import CardSelection from './CardSelection';

interface CardSelectionModalProps {
  isOpen: boolean;
  selectedCard?: CardValue;
  onCardSelect: (cardValue: CardValue) => void;
  onClose: () => void;
}

const CardSelectionModal: React.FC<CardSelectionModalProps> = ({
  isOpen,
  selectedCard,
  onCardSelect,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="card-selection-modal">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-content">
        <div className="modal-header">
          <h3>Adjust Your Estimate</h3>
          <button 
            className="close-button" 
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          <CardSelection
            selectedCard={selectedCard}
            onCardSelect={onCardSelect}
            disabled={false}
          />
        </div>
      </div>
    </div>
  );
};

export default CardSelectionModal;