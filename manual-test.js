#!/usr/bin/env node

/**
 * Manual Test Script for Planning Poker System
 * This script performs basic API and functionality tests
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api';

async function runManualTests() {
  console.log('🧪 Running Manual Tests for Planning Poker System\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${API_BASE}/health`);
    const healthData = await healthResponse.json();
    console.log('   ✅ Health check:', healthData.status);

    // Test 2: Create Room
    console.log('\n2. Testing room creation...');
    const createRoomResponse = await fetch(`${API_BASE}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Room' })
    });
    const roomData = await createRoomResponse.json();
    console.log('   ✅ Room created:', roomData.room.name, 'ID:', roomData.room.id);

    // Test 3: Get Room
    console.log('\n3. Testing room retrieval...');
    const getRoomResponse = await fetch(`${API_BASE}/rooms/${roomData.room.id}`);
    const retrievedRoom = await getRoomResponse.json();
    console.log('   ✅ Room retrieved:', retrievedRoom.room.name);

    // Test 4: Join Room
    console.log('\n4. Testing player join...');
    const joinResponse = await fetch(`${API_BASE}/rooms/${roomData.room.id}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName: 'Test Player' })
    });
    const joinData = await joinResponse.json();
    console.log('   ✅ Player joined:', joinData.player.name);

    // Test 5: Get Players
    console.log('\n5. Testing player list...');
    const playersResponse = await fetch(`${API_BASE}/rooms/${roomData.room.id}/players`);
    const playersData = await playersResponse.json();
    console.log('   ✅ Players in room:', playersData.players.length);

    // Test 6: WebSocket Stats
    console.log('\n6. Testing WebSocket stats...');
    const statsResponse = await fetch(`${API_BASE}/websocket/stats`);
    const statsData = await statsResponse.json();
    console.log('   ✅ WebSocket stats:', {
      totalConnections: statsData.totalConnections,
      playersConnected: statsData.playersConnected
    });

    console.log('\n🎉 All manual tests passed!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ API endpoints working');
    console.log('   ✅ Room creation and management');
    console.log('   ✅ Player management');
    console.log('   ✅ WebSocket service integration');
    console.log('\n💡 To test WebSocket functionality, open the frontend application');
    console.log('   and test real-time features like joining rooms and card selection.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Make sure the backend server is running on port 3001');
    console.log('   Run: cd backend && npm start');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runManualTests();
}

module.exports = { runManualTests };