import { EstimationResult } from '../types';

export interface CardDistribution {
  value: string;
  count: number;
  percentage: number;
}

/**
 * Calculate card distribution for pie chart visualization
 */
export function getCardDistribution(result: EstimationResult): CardDistribution[] {
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
}