/**
 * Phrase utilities for Planning Poker results
 * Separates phrase logic from UI components
 */

export type PhraseType = 'regular' | 'consensus';

// Regular phrases for mixed voting results
const REGULAR_PHRASES = [
  "The votes are in, but the numbers are out! 🗳️",
  "Cards on the table, but need a little work! 🃏",
  "The players have spoken, but must speak again! 📊",
  "Estimations are in, but need work! ✨",
  "The results are revealed and need a -twerk- tweak! 🎭",
  "Democracy, here we come! 🏛️",
  "The hips don't lie and nor do the cards! 🎯",
  "Voting session over but has only just begun! 📋",
  "The jury needs to adjourn! ⚖️",
  "Numbers are crunched and are a little too crunchy! 🔢",
  "The tally is tallied wrong! 📈",
  "Estimates are in... and out! 🔒",
  "The people have spoken but in different languages! 📢",
  "Survey says...nu-nurr 📺",
  "My hovercraft is full of eels, the cards give me bad feels! 🚁",
  "The dice have been cast, let's have a second roll! 🎲",
  "Ballots counted, nearly there! 🗃️",
  "The verdict is in, and it's a split jury! 📜",
  "Time to face the music, who's going to sing for their vote? 🎵",
  "The moment of truth still awaits consensus! ⏰",
  "I've seen closer parking at a monster truck rally! 🎲"
] as const;

// Special phrases for consensus results
const CONSENSUS_PHRASES = [
  "Hole in one! ⛳",
  "Immediate consensus! 🤝",
  "Perfect alignment! ✨",
  "Unanimous decision! 👏",
  "Great minds think alike! 🧠",
  "Team harmony achieved! 🎵",
  "Bullseye! 🎯",
  "Flawless agreement! 💎",
  "Synchronized thinking! 🔄",
  "Crystal clear consensus! 💎",
  "No debate needed! ✅",
  "Instant agreement! ⚡",
  "Perfect match! 🎪",
  "Team telepathy! 🔮",
  "Effortless consensus! 🌟",
  "Spot on alignment! 🎪",
  "Unified vision! 👁️",
  "Seamless agreement! 🤝",
  "Picture perfect! 📸",
  "Nailed it together! 🔨"
] as const;

/**
 * Get a random phrase from the specified phrase type
 */
function getRandomPhrase(phrases: readonly string[]): string {
  return phrases[Math.floor(Math.random() * phrases.length)];
}

/**
 * Get a random regular phrase for mixed voting results
 */
export function getRandomRegularPhrase(): string {
  return getRandomPhrase(REGULAR_PHRASES);
}

/**
 * Get a random consensus phrase for unanimous results
 */
export function getRandomConsensusPhrase(): string {
  return getRandomPhrase(CONSENSUS_PHRASES);
}

/**
 * Get appropriate phrase based on consensus state
 */
export function getPhraseForResults(hasConsensus: boolean): string {
  return hasConsensus ? getRandomConsensusPhrase() : getRandomRegularPhrase();
}

/**
 * Get phrase type for CSS styling
 */
export function getPhraseType(hasConsensus: boolean): PhraseType {
  return hasConsensus ? 'consensus' : 'regular';
}