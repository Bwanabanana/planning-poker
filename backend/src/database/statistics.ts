import { EstimationResult, PLANNING_POKER_DECK } from '../types';
import { db } from './in-memory-db';

/**
 * Statistical calculations for Planning Poker results
 */

export function calculateEstimationResult(roomId: string): EstimationResult | null {
  const room = db.getRoom(roomId);
  if (!room || !room.currentRound || !room.currentRound.isRevealed) {
    return null;
  }

  const cards = Array.from(room.currentRound.cards.entries()).map(([playerId, cardValue]) => {
    const player = room.players.find(p => p.id === playerId);
    return {
      playerId,
      playerName: player?.name || 'Unknown',
      cardValue
    };
  });

  if (cards.length === 0) {
    return {
      cards: [],
      statistics: {
        average: 0,
        median: '0',
        range: [],
        hasVariance: false
      }
    };
  }

  const statistics = calculateStatistics(cards.map(c => c.cardValue));

  return {
    cards,
    statistics
  };
}

function calculateStatistics(cardValues: string[]): {
  average: number;
  median: string;
  range: string[];
  hasVariance: boolean;
} {
  // Separate numeric and non-numeric cards
  const numericCards: number[] = [];
  const nonNumericCards: string[] = [];

  cardValues.forEach(value => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      numericCards.push(numValue);
    } else {
      nonNumericCards.push(value);
    }
  });

  // Calculate statistics for numeric cards
  let average = 0;
  let median = '0';
  let hasVariance = false;

  if (numericCards.length > 0) {
    // Calculate average
    average = numericCards.reduce((sum, val) => sum + val, 0) / numericCards.length;

    // Calculate median
    const sortedNumeric = [...numericCards].sort((a, b) => a - b);
    const midIndex = Math.floor(sortedNumeric.length / 2);
    
    if (sortedNumeric.length % 2 === 0) {
      const medianValue = (sortedNumeric[midIndex - 1] + sortedNumeric[midIndex]) / 2;
      median = medianValue.toString();
    } else {
      median = sortedNumeric[midIndex].toString();
    }

    // Check for variance (significant differences in numeric values)
    const min = Math.min(...numericCards);
    const max = Math.max(...numericCards);
    // Consider variance significant if the range is more than 2 story points
    // or if the ratio between max and min is greater than 2
    hasVariance = (max - min) > 2 || (min > 0 && max / min > 2);
  } else if (nonNumericCards.length > 0) {
    // All cards are non-numeric, use the first non-numeric card as median
    median = nonNumericCards[0];
  }

  // Get unique values for range, sorted by Planning Poker deck order
  const uniqueValues = [...new Set(cardValues)];
  const range = sortCardValuesByDeckOrder(uniqueValues);

  return {
    average: Math.round(average * 100) / 100, // Round to 2 decimal places
    median,
    range,
    hasVariance
  };
}

function sortCardValuesByDeckOrder(values: string[]): string[] {
  const deckOrder = [...PLANNING_POKER_DECK];
  
  return values.sort((a, b) => {
    const aIndex = deckOrder.indexOf(a as any);
    const bIndex = deckOrder.indexOf(b as any);
    
    // If both are in the deck, sort by deck order
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    // If only one is in the deck, deck values come first
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    // If neither is in the deck, sort alphabetically
    return a.localeCompare(b);
  });
}

export function getCardDistribution(roomId: string): Record<string, number> | null {
  const room = db.getRoom(roomId);
  if (!room || !room.currentRound || !room.currentRound.isRevealed) {
    return null;
  }

  const distribution: Record<string, number> = {};
  
  room.currentRound.cards.forEach(cardValue => {
    distribution[cardValue] = (distribution[cardValue] || 0) + 1;
  });

  return distribution;
}

export function hasSignificantVariance(cardValues: string[]): boolean {
  const numericCards = cardValues
    .map(v => parseFloat(v))
    .filter(v => !isNaN(v));

  if (numericCards.length < 2) return false;

  const min = Math.min(...numericCards);
  const max = Math.max(...numericCards);

  // Consider variance significant if the range is more than 2 story points
  // or if the ratio between max and min is greater than 2
  return (max - min) > 2 || (min > 0 && max / min > 2);
}

/**
 * Gets variance analysis for highlighting and discussion prompts
 * Requirements: 5.3
 */
export function getVarianceAnalysis(roomId: string): {
  hasVariance: boolean;
  varianceLevel: 'none' | 'moderate' | 'high';
  discussionPrompt: string;
  highlightedCards: string[];
} | null {
  const room = db.getRoom(roomId);
  if (!room || !room.currentRound || !room.currentRound.isRevealed) {
    return null;
  }

  const cardValues = Array.from(room.currentRound.cards.values());
  const numericCards = cardValues
    .map(v => parseFloat(v))
    .filter(v => !isNaN(v));

  if (numericCards.length < 2) {
    return {
      hasVariance: false,
      varianceLevel: 'none',
      discussionPrompt: '',
      highlightedCards: []
    };
  }

  const min = Math.min(...numericCards);
  const max = Math.max(...numericCards);
  const range = max - min;
  const ratio = min > 0 ? max / min : 0;

  const hasVariance = range > 2 || (min > 0 && ratio > 2);
  
  let varianceLevel: 'none' | 'moderate' | 'high' = 'none';
  let discussionPrompt = '';
  let highlightedCards: string[] = [];

  if (hasVariance) {
    // Determine variance level
    if (range > 8 || ratio > 5) {
      varianceLevel = 'high';
      discussionPrompt = 'High variance detected! Consider discussing the story requirements and complexity.';
    } else {
      varianceLevel = 'moderate';
      discussionPrompt = 'Moderate variance detected. Team discussion may help reach consensus.';
    }

    // Highlight the extreme values (min and max)
    const minStr = min.toString();
    const maxStr = max.toString();
    
    highlightedCards = cardValues.filter(card => {
      const numValue = parseFloat(card);
      return !isNaN(numValue) && (numValue === min || numValue === max);
    });
  }

  return {
    hasVariance,
    varianceLevel,
    discussionPrompt,
    highlightedCards
  };
}

/**
 * Gets color coding suggestions for estimation patterns
 * Requirements: 7.4
 */
export function getEstimationPatterns(roomId: string): {
  consensus: boolean;
  majorityCard: string | null;
  outliers: string[];
  colorCoding: Record<string, 'consensus' | 'majority' | 'outlier' | 'normal'>;
} | null {
  const room = db.getRoom(roomId);
  if (!room || !room.currentRound || !room.currentRound.isRevealed) {
    return null;
  }

  const cardValues = Array.from(room.currentRound.cards.values());
  const distribution = getCardDistribution(roomId);
  
  if (!distribution) {
    return null;
  }

  const totalCards = cardValues.length;
  const uniqueValues = Object.keys(distribution);
  
  // Check for consensus (all same value)
  const consensus = uniqueValues.length === 1;
  
  // Find majority card (more than 50% of votes)
  let majorityCard: string | null = null;
  if (!consensus) {
    for (const [card, count] of Object.entries(distribution)) {
      if (count > totalCards / 2) {
        majorityCard = card;
        break;
      }
    }
  }

  // Find outliers (cards with only 1 vote when there are 3+ players)
  const outliers: string[] = [];
  if (totalCards >= 3 && !consensus) {
    for (const [card, count] of Object.entries(distribution)) {
      if (count === 1) {
        outliers.push(card);
      }
    }
  }

  // Generate color coding
  const colorCoding: Record<string, 'consensus' | 'majority' | 'outlier' | 'normal'> = {};
  
  for (const card of uniqueValues) {
    if (consensus) {
      colorCoding[card] = 'consensus';
    } else if (card === majorityCard) {
      colorCoding[card] = 'majority';
    } else if (outliers.includes(card)) {
      colorCoding[card] = 'outlier';
    } else {
      colorCoding[card] = 'normal';
    }
  }

  return {
    consensus,
    majorityCard,
    outliers,
    colorCoding
  };
}