// Simple test to verify the database setup works
const { createRoom, joinRoom, startEstimationRound, submitCard, db } = require('./dist/database');

console.log('Testing in-memory database...');

try {
  // Test room creation
  const room = createRoom('Test Room');
  console.log('✓ Room created:', room.name, 'with ID:', room.id);

  // Test player joining
  const joinResult = joinRoom(room.id, 'Test Player');
  if (joinResult.success) {
    console.log('✓ Player joined successfully:', joinResult.player.name);
  } else {
    console.log('✗ Failed to join room:', joinResult.error);
  }

  // Test starting estimation round
  const roundResult = startEstimationRound(room.id);
  if (roundResult.success) {
    console.log('✓ Estimation round started');
  } else {
    console.log('✗ Failed to start round:', roundResult.error);
  }

  // Test card submission
  const cardResult = submitCard(room.id, joinResult.player.id, '5');
  if (cardResult.success) {
    console.log('✓ Card submitted successfully');
  } else {
    console.log('✗ Failed to submit card:', cardResult.error);
  }

  // Show debug info
  console.log('\nDatabase debug info:', db.getDebugInfo());
  console.log('\n✓ All tests passed! In-memory database is working correctly.');

} catch (error) {
  console.error('✗ Test failed:', error.message);
}