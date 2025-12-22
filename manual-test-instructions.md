# Manual Test Instructions for Estimation Results on Rejoin

## Test Scenario
Verify that when a user leaves during the results display phase and rejoins, they can see the estimation results. Also verify that other players see the correct connection status (no duplicate players).

## Steps to Test

### Setup
1. Start the backend server: `cd backend && npm start`
2. Start the frontend server: `cd frontend && npm start`
3. Open two browser windows/tabs

### Test Flow

#### Phase 1: Initial Setup
1. **Window 1 (Alice)**: Join room "test-room" as "Alice"
2. **Window 2 (Bob)**: Join room "test-room" as "Bob"
3. Verify both players see each other in the room
4. **Check**: Bob should see Alice as "connected" in the player list
5. **Check**: Alice should see Bob as "connected" in the player list

#### Phase 2: Voting
1. **Alice**: Click "Start Round"
2. **Alice**: Select card "5"
3. **Bob**: Select card "8"
4. **Alice or Bob**: Click "Reveal Cards"
5. Verify both players see the estimation results with:
   - Pie chart showing distribution
   - Player cards showing Alice: 5, Bob: 8
   - Statistics (average, variance, etc.)

#### Phase 3: Leave and Rejoin (The Fix)
1. **Alice**: Leave the room (click "Leave Room" or close tab)
2. **Check**: Bob should see Alice as "disconnected" in the player list
3. **Alice**: Rejoin the same room "test-room" as "Alice"
4. **Expected Results**: 
   - Alice should immediately see the estimation results (not the waiting/voting interface)
   - Alice should see the same pie chart and player cards as before
   - Alice should see Bob's card (8) and her own card (5)
   - **CRITICAL**: Bob should see Alice as "connected" again (no duplicate Alice entries)
   - **CRITICAL**: Bob should see exactly 2 players total (Alice and Bob)

#### Phase 4: Player State Verification (New Test)
1. **Bob**: Check the player list sidebar
2. **Expected**: Should show exactly 2 players:
   - Alice (connected)
   - Bob (connected)
3. **Alice**: Leave and rejoin again
4. **Bob**: Verify player list still shows exactly 2 players (no duplicates)
5. **Alice**: Verify she can see results immediately on each rejoin

#### Phase 5: Voting State Cleanup Test (Critical Fix)
1. **Alice & Bob**: Start a new round (click "Start New Round")
2. **Alice**: Vote "5"
3. **Bob**: Vote "8"
4. **Alice**: Leave the room completely (close tab or click "Leave Room")
5. **Bob**: Check that only Bob's vote is counted (should show 1/1 players voted)
6. **Alice**: Rejoin room "test-room" as "Alice"
7. **Alice**: Vote "3"
8. **Bob**: Click "Reveal Cards"
9. **Expected Results**:
   - Should show exactly 2 votes total (not 3)
   - Alice: 3, Bob: 8
   - No duplicate or orphaned votes
   - Vote count should match player count

#### Phase 6: Disconnect/Reconnect Voting Test
1. **Alice & Bob**: Start another new round
2. **Alice**: Vote "2"
3. **Bob**: Vote "5"
4. **Alice**: Disconnect (close browser tab, don't use "Leave Room")
5. **Bob**: Should see Alice as disconnected, vote count should be 1/1
6. **Alice**: Reconnect and rejoin room "test-room" as "Alice"
7. **Alice**: Vote "13" (different from before)
8. **Bob**: Reveal cards
9. **Expected Results**:
   - Should show exactly 2 votes total
   - Alice: 13 (not 2), Bob: 5
   - Alice's old vote (2) should be gone

#### Phase 7: Pie Chart Consensus Test (Visual Fix)
1. **Alice & Bob**: Start another new round
2. **Alice**: Vote "8"
3. **Bob**: Vote "8" (same as Alice)
4. **Alice or Bob**: Reveal cards
5. **Expected Results**:
   - Pie chart should show a **colored circle** (blue), not white
   - Should show "8: 100%" in the legend
   - Both player cards should show "8"
6. **Test different consensus values**:
   - Try with "5", "13", "?" - all should show colored circles
   - Never should show white/empty pie chart

### What Was Fixed

#### Original Issues Fixed:
- **Before**: Alice would rejoin and see the waiting state, missing the results
- **After**: Alice receives both `room-joined` and `cards-revealed` events, showing the results immediately

#### New Issue Fixed:
- **Before**: Bob would see Alice as both "disconnected" and "connected" (duplicate entries)
- **After**: Player selection status events provide authoritative player state, preventing duplicates

#### Critical Voting Issue Fixed:
- **Before**: When a player left/disconnected and rejoined, their old vote remained, causing duplicate votes (e.g., 3 votes with 2 players)
- **After**: Voting state is cleaned up when players leave/disconnect, ensuring vote count matches player count

#### Pie Chart Consensus Issue Fixed:
- **Before**: When all players voted the same value (100% consensus), the pie chart appeared white/empty
- **After**: 100% consensus now shows a properly colored circle instead of trying to draw an invalid arc

### Technical Details
The fix ensures that when a player rejoins a room:
1. **Results Display**: Backend detects `room.currentRound.isRevealed === true` and sends both `room-joined` and `cards-revealed` events
2. **Player State Sync**: Frontend uses `player-selection-status` events as the authoritative source for player connection status, preventing duplicate entries

## Success Criteria
✅ Alice sees estimation results immediately upon rejoining  
✅ All voting data is preserved (player cards, statistics)  
✅ No need to start a new round to see previous results  
✅ Bob sees Alice as connected (not disconnected) after rejoin  
✅ **NEW**: No duplicate player entries in the player list  
✅ **NEW**: Player count remains consistent (exactly 2 players)  
✅ **NEW**: Multiple leave/rejoin cycles work correctly  
✅ **CRITICAL**: Vote count always matches player count (no duplicate votes)  
✅ **CRITICAL**: Old votes are cleaned up when players leave/disconnect  
✅ **CRITICAL**: Players can vote fresh after reconnecting  
✅ **VISUAL**: Pie chart shows colored circle for 100% consensus (not white)  
✅ **VISUAL**: All consensus scenarios display properly colored charts  
✅ **NEW FEATURE**: Remove button (✕) appears only for disconnected players  
✅ **NEW FEATURE**: Connected players can remove disconnected players  
✅ **NEW FEATURE**: Removed players are completely cleaned from room state  
✅ **NEW FEATURE**: Removed players can rejoin as fresh players  
✅ **ACCESSIBILITY**: Remove button has proper titles and labels  

#### Phase 8: Remove Disconnected Player Test (New Feature)
1. **Alice & Bob**: Both should be in the room and connected
2. **Alice**: Disconnect (close browser tab, don't use "Leave Room")
3. **Bob**: Should see Alice as "disconnected" in the player list
4. **Bob**: Look for the red "✕" button next to Alice's name in the disconnected players section
5. **Bob**: Click the "✕" button to remove Alice
6. **Expected Results**:
   - Alice should be completely removed from the room
   - Bob should no longer see Alice in either connected or disconnected sections
   - Player count should show only Bob
7. **Alice**: Try to rejoin room "test-room" as "Alice"
8. **Expected Results**:
   - Alice should be able to rejoin as a fresh player
   - Bob should see Alice as a new connected player
   - No voting history should be preserved from before removal

#### Phase 9: Remove Player Permissions Test
1. **Alice & Bob**: Both connected in room
2. **Alice**: Try to find remove button next to Bob (who is connected)
3. **Expected**: No remove button should appear for connected players
4. **Bob**: Disconnect (close tab)
5. **Alice**: Should now see remove button (✕) next to Bob in disconnected section
6. **Alice**: Click remove button
7. **Expected**: Bob should be removed from room
8. **Bob**: Reconnect and rejoin
9. **Expected**: Bob rejoins as fresh player with no previous state

### Remove Player Feature Details
- **UI**: Red "✕" button appears only next to disconnected players
- **Permissions**: Any connected player can remove disconnected players
- **Behavior**: Completely removes player from room (not just marking as disconnected)
- **State Cleanup**: Removes all voting history and player data
- **Accessibility**: Button has proper title and aria-label for screen readers  