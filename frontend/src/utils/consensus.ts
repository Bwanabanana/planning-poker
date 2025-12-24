/**
 * Consensus detection utilities
 * Business logic for determining voting consensus
 */

import type { EstimationResult } from '../types';

/**
 * Check if all cards have the same value (consensus achieved)
 */
export function hasConsensus(result: EstimationResult): boolean {
  if (result.cards.length === 0) return false;
  
  const firstValue = result.cards[0].cardValue;
  return result.cards.every(card => card.cardValue === firstValue);
}

/**
 * Get consensus information for UI display
 */
export function getConsensusInfo(result: EstimationResult) {
  const consensus = hasConsensus(result);
  const consensusValue = consensus ? result.cards[0]?.cardValue : null;
  
  return {
    hasConsensus: consensus,
    consensusValue,
    participantCount: result.cards.length
  };
}