// Export the main database instance and class
export { InMemoryDatabase, db } from './in-memory-db';

// Export room utility functions
export {
  createRoom,
  createPlayer,
  createEstimationRound,
  joinRoom,
  leaveRoom,
  startEstimationRound,
  submitCard,
  revealCards,
  updatePlayerConnectionStatus,
  getAllPlayersWithCards,
  isEstimationComplete
} from './room-utils';

// Export statistics functions
export {
  calculateEstimationResult,
  getCardDistribution,
  hasSignificantVariance,
  getVarianceAnalysis,
  getEstimationPatterns
} from './statistics';