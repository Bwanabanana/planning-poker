#!/usr/bin/env node

/**
 * End-to-End Test Runner for Planning Poker System
 * This script runs comprehensive integration tests
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Planning Poker End-to-End Tests...\n');

// Run the compiled TypeScript tests
const testProcess = spawn('npx', ['jest', 'test-e2e.ts', '--verbose', '--detectOpenHandles'], {
  cwd: path.join(__dirname),
  stdio: 'inherit',
  shell: true
});

testProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ All end-to-end tests passed!');
    console.log('🎉 Planning Poker system is working correctly.');
  } else {
    console.log('\n❌ Some tests failed.');
    console.log('🔍 Please check the test output above for details.');
  }
  process.exit(code);
});

testProcess.on('error', (error) => {
  console.error('❌ Failed to run tests:', error.message);
  process.exit(1);
});