import { Server } from 'socket.io';
import { Player } from '../shared-types';
import { roomService } from './room-service';
import { playerService } from './player-service';
import { estimationService } from './estimation-service';

/**
 * WebSocket Service for Planning Poker system
 * Handles real-time communication and room-based event broadcasting
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
export class WebSocketService {
  private io: Server;
  private playerSocketMap: Map<string, string> = new Map(); // playerId -> socketId
  private socketPlayerMap: Map<string, string> = new Map(); // socketId -> playerId

  constructor(io: Server) {
    this.io = io;
    this.setupEventHandlers();
  }

  /**
   * Set up WebSocket event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Handle room joining
      socket.on('join-room', async (data: any) => {
        console.log('Received join-room event from socket:', socket.id, 'with data:', data);
        await this.handleJoinRoom(socket, data);
      });

      // Handle starting estimation rounds
      socket.on('start-round', async () => {
        await this.handleStartRound(socket);
      });

      // Handle card selection
      socket.on('select-card', async (data: any) => {
        await this.handleSelectCard(socket, data);
      });

      // Handle card reveal
      socket.on('reveal-cards', async () => {
        await this.handleRevealCards(socket);
      });

      // Handle leaving a room
      socket.on('leave-room', async () => {
        await this.handleLeaveRoom(socket);
      });

      // Handle removing a player from a room
      socket.on('remove-player', async (data: any) => {
        await this.handleRemovePlayer(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('Socket disconnecting:', socket.id);
        this.handleDisconnect(socket);
      });
    });
  }

  /**
   * Handle player joining a room
   * Requirements: 6.1, 6.2, 3.4, 3.5
   */
  private async handleJoinRoom(socket: any, data: { roomId: string; playerName: string }): Promise<void> {
    try {
      const { roomId, playerName } = data;

      // Validate input
      if (!roomId || typeof roomId !== 'string' || !roomId.trim()) {
        socket.emit('error', { message: 'Room ID is required and must be a valid string' });
        return;
      }

      if (!playerName || typeof playerName !== 'string' || !playerName.trim()) {
        socket.emit('error', { message: 'Player name is required and must be a valid string' });
        return;
      }

      // Sanitize inputs
      const sanitizedRoomId = roomId.trim();
      const sanitizedPlayerName = playerName.trim();

      // Validate player name length
      if (sanitizedPlayerName.length > 30) {
        socket.emit('error', { message: 'Player name must be 30 characters or less' });
        return;
      }

      if (sanitizedPlayerName.length < 1) {
        socket.emit('error', { message: 'Player name cannot be empty' });
        return;
      }

      // Check if room exists, create if it doesn't
      let room = roomService.getRoomState(sanitizedRoomId);
      if (!room) {
        try {
          console.log(`Room ${sanitizedRoomId} doesn't exist, creating it automatically`);
          roomService.createRoom(sanitizedRoomId);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create room';
          socket.emit('error', { message: errorMessage });
          return;
        }
      }

      // Attempt to join the room (this handles both new players and reconnections)
      const result = playerService.joinRoom(sanitizedRoomId, sanitizedPlayerName);
      if (!result.success || !result.room || !result.player) {
        const errorMessage = result.error || 'Failed to join room';
        socket.emit('error', { message: errorMessage });
        return;
      }

      // Store player-socket mapping
      this.playerSocketMap.set(result.player.id, socket.id);
      this.socketPlayerMap.set(socket.id, result.player.id);
      console.log('Created socket mapping:', socket.id, '->', result.player.id);

      // Join the socket to the room
      await socket.join(sanitizedRoomId);

      // Send room state to the joining player with their player info
      socket.emit('room-joined', { 
        room: result.room,
        currentPlayer: result.player 
      });

      // If the current round is revealed, also send the estimation results
      if (result.room.currentRound && result.room.currentRound.isRevealed) {
        try {
          const estimationResult = estimationService.calculateEstimationResult(sanitizedRoomId);
          if (estimationResult) {
            console.log(`Sending estimation results to rejoining player ${result.player.id}`);
            socket.emit('cards-revealed', { result: estimationResult });
          }
        } catch (error) {
          console.error('Error calculating estimation results for rejoining player:', error);
        }
      }

      // Notify other players in the room about the player joining/reconnecting
      socket.to(sanitizedRoomId).emit('player-joined', { player: result.player });

      // Broadcast current player selection status to all players
      this.broadcastPlayerSelectionStatus(sanitizedRoomId);

      console.log(`Player ${result.player.name} (${result.player.id}) joined room ${sanitizedRoomId} - connection status: ${result.player.isConnected}`);
    } catch (error) {
      console.error('Error handling join room:', error);
      const errorMessage = error instanceof Error ? error.message : 'Internal server error while joining room';
      socket.emit('error', { message: errorMessage });
    }
  }

  /**
   * Handle starting an estimation round
   * Requirements: 6.3, 2.1, 2.2
   */
  private async handleStartRound(socket: any): Promise<void> {
    try {
      console.log('handleStartRound called for socket:', socket.id);
      console.log('Current socketPlayerMap:', Array.from(this.socketPlayerMap.entries()));
      
      let playerId = this.socketPlayerMap.get(socket.id);
      
      // If no direct mapping found, try to find player by checking all rooms
      // This handles the case where socket reconnected but mapping was lost
      if (!playerId) {
        console.log('No direct socket mapping found, searching for player in rooms...');
        const rooms = roomService.getAllRooms();
        
        for (const room of rooms) {
          // Look for a disconnected player in this room that might be this socket
          // Since the socket disconnected and reconnected, the player would be marked as disconnected
          const disconnectedPlayer = room.players.find(p => !p.isConnected);
          if (disconnectedPlayer && room.players.length === 1) {
            // If there's only one player in a room (and they're disconnected), assume it's this socket reconnecting
            console.log('Found potential disconnected player:', disconnectedPlayer.id, 'in room:', room.id);
            playerId = disconnectedPlayer.id;
            
            // Update the socket mapping and reconnect the player
            this.playerSocketMap.set(playerId, socket.id);
            this.socketPlayerMap.set(socket.id, playerId);
            
            // Mark player as connected again
            playerService.updateConnectionStatus(playerId, true);
            
            // IMPORTANT: Join the socket to the room so it can receive broadcasts
            await socket.join(room.id);
            console.log('Socket joined room:', room.id);
            
            console.log('Updated socket mapping and reconnected player:', socket.id, '->', playerId);
            break;
          }
        }
      }
      
      if (!playerId) {
        console.log('Player not found in socketPlayerMap for socket:', socket.id);
        socket.emit('error', { message: 'Player not found' });
        return;
      }

      console.log('Found playerId:', playerId);
      const roomId = playerService.getPlayerRoom(playerId);
      if (!roomId) {
        console.log('Player not in any room:', playerId);
        socket.emit('error', { message: 'Player not in any room' });
        return;
      }

      console.log('Player', playerId, 'is in room:', roomId);

      // Start the estimation round using the estimation service
      try {
        estimationService.startRound(roomId);
        
        // Broadcast the round started event to all players in the room
        this.broadcastToRoom(roomId, 'round-started', {});

        // Broadcast initial player selection status (all players should have hasSelected: false)
        this.broadcastPlayerSelectionStatus(roomId);

        console.log(`Estimation round started in room ${roomId} by player ${playerId}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to start round';
        socket.emit('error', { message: errorMessage });
        console.error(`Error starting round in room ${roomId}:`, error);
      }
    } catch (error) {
      console.error('Error handling start round:', error);
      socket.emit('error', { message: 'Internal server error' });
    }
  }

  /**
   * Handle card selection
   * Requirements: 6.2, 6.3, 4.2, 4.3, 4.4, 4.5
   */
  private async handleSelectCard(socket: any, data: { cardValue: string }): Promise<void> {
    try {
      const playerId = this.socketPlayerMap.get(socket.id);
      if (!playerId) {
        socket.emit('error', { message: 'Player session not found. Please refresh and rejoin the room.' });
        return;
      }

      const roomId = playerService.getPlayerRoom(playerId);
      if (!roomId) {
        socket.emit('error', { message: 'You are not currently in a room. Please join a room first.' });
        return;
      }

      const { cardValue } = data;
      if (!cardValue || typeof cardValue !== 'string') {
        socket.emit('error', { message: 'Card value is required and must be a valid string' });
        return;
      }

      // Validate card value against standard deck
      const validCards = ['0.5', '1', '2', '3', '5', '8', '13', '21', '?', '☕'];
      if (!validCards.includes(cardValue)) {
        socket.emit('error', { message: 'Invalid card value. Please select a valid card from the deck.' });
        return;
      }

      // Submit the card using the estimation service
      try {
        estimationService.submitCard(roomId, playerId, cardValue);
        
        // Broadcast the card selection status to all players in the room
        this.broadcastToRoom(roomId, 'card-selected', { 
          playerId, 
          hasSelected: true 
        });

        // Broadcast updated player selection status to all players
        this.broadcastPlayerSelectionStatus(roomId);

        // Check if all players have now selected cards
        const allCardsSubmitted = estimationService.areAllCardsSubmitted(roomId);
        if (allCardsSubmitted) {
          // Notify all players that estimation is complete
          this.broadcastToRoom(roomId, 'all-cards-submitted', {});
          console.log(`All players have selected cards in room ${roomId}`);
        }

        // If cards are already revealed, recalculate and broadcast updated results
        const room = roomService.getRoomState(roomId);
        if (room && room.currentRound && room.currentRound.isRevealed) {
          try {
            const result = estimationService.revealCards(roomId);
            if (result) {
              this.broadcastToRoom(roomId, 'cards-revealed', { result });
              console.log(`Results updated in room ${roomId} after card adjustment`);
            }
          } catch (error) {
            console.error(`Error recalculating results after card adjustment in room ${roomId}:`, error);
          }
        }

        console.log(`Player ${playerId} selected card "${cardValue}" in room ${roomId}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to select card';
        socket.emit('error', { message: errorMessage });
        console.error(`Error selecting card for player ${playerId} in room ${roomId}:`, error);
      }
    } catch (error) {
      console.error('Error handling select card:', error);
      const errorMessage = error instanceof Error ? error.message : 'Internal server error while selecting card';
      socket.emit('error', { message: errorMessage });
    }
  }

  /**
   * Handle card reveal
   * Requirements: 6.4, 5.1
   */
  private async handleRevealCards(socket: any): Promise<void> {
    try {
      const playerId = this.socketPlayerMap.get(socket.id);
      if (!playerId) {
        socket.emit('error', { message: 'Player not found' });
        return;
      }

      const roomId = playerService.getPlayerRoom(playerId);
      if (!roomId) {
        socket.emit('error', { message: 'Player not in any room' });
        return;
      }

      // Reveal cards using the estimation service
      try {
        const result = estimationService.revealCards(roomId);
        
        if (result) {
          // Broadcast the results to all players in the room
          this.broadcastToRoom(roomId, 'cards-revealed', { result });
          console.log(`Cards revealed in room ${roomId} by player ${playerId}`);
        } else {
          socket.emit('error', { message: 'Failed to reveal cards' });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to reveal cards';
        socket.emit('error', { message: errorMessage });
        console.error(`Error revealing cards in room ${roomId}:`, error);
      }
    } catch (error) {
      console.error('Error handling reveal cards:', error);
      socket.emit('error', { message: 'Internal server error' });
    }
  }

  /**
   * Handle player leaving a room voluntarily
   * Requirements: 3.1, 3.2
   */
  private async handleLeaveRoom(socket: any): Promise<void> {
    try {
      const playerId = this.socketPlayerMap.get(socket.id);
      if (!playerId) {
        console.log('No player found for socket when leaving room:', socket.id);
        return;
      }

      const roomId = playerService.getPlayerRoom(playerId);
      if (!roomId) {
        console.log('Player not in any room when trying to leave:', playerId);
        return;
      }

      console.log(`Player ${playerId} leaving room ${roomId} voluntarily`);

      // Remove player from room
      const leaveResult = playerService.leaveRoom(playerId);
      if (leaveResult.success) {
        // Clean up socket mappings
        this.playerSocketMap.delete(playerId);
        this.socketPlayerMap.delete(socket.id);

        // Notify other players in the room about the departure
        socket.to(roomId).emit('player-left', { playerId });

        // Broadcast updated player selection status to remaining players
        this.broadcastPlayerSelectionStatus(roomId);

        console.log(`Player ${playerId} successfully left room ${roomId}`);
      } else {
        console.error(`Failed to remove player ${playerId} from room ${roomId}`);
      }
    } catch (error) {
      console.error('Error handling leave room:', error);
    }
  }

  /**
   * Handle removing a player from a room
   * Requirements: 3.1, 3.2
   */
  private async handleRemovePlayer(socket: any, data: { playerId: string }): Promise<void> {
    try {
      const requestingPlayerId = this.socketPlayerMap.get(socket.id);
      if (!requestingPlayerId) {
        socket.emit('error', { message: 'Player not found' });
        return;
      }

      const { playerId } = data;
      if (!playerId || typeof playerId !== 'string') {
        socket.emit('error', { message: 'Player ID is required' });
        return;
      }

      // Get the room of the requesting player
      const roomId = playerService.getPlayerRoom(requestingPlayerId);
      if (!roomId) {
        socket.emit('error', { message: 'You are not in any room' });
        return;
      }

      // Verify the player to be removed is in the same room
      const targetPlayerRoom = playerService.getPlayerRoom(playerId);
      if (targetPlayerRoom !== roomId) {
        socket.emit('error', { message: 'Player not found in your room' });
        return;
      }

      // Get player info before removal for logging
      const targetPlayer = playerService.getPlayerInRoom(playerId, roomId);
      if (!targetPlayer) {
        socket.emit('error', { message: 'Player not found in room' });
        return;
      }

      // Only allow removal of disconnected players
      if (targetPlayer.isConnected) {
        socket.emit('error', { message: 'Cannot remove connected players' });
        return;
      }

      console.log(`Player ${requestingPlayerId} requesting removal of ${playerId} (${targetPlayer.name}) from room ${roomId}`);

      // Remove player from room
      const removeResult = playerService.leaveRoom(playerId);
      if (removeResult.success) {
        // Clean up any socket mappings (though disconnected players shouldn't have active sockets)
        const targetSocketId = this.playerSocketMap.get(playerId);
        if (targetSocketId) {
          this.playerSocketMap.delete(playerId);
          this.socketPlayerMap.delete(targetSocketId);
        }

        // Notify all players in the room about the removal
        this.broadcastToRoom(roomId, 'player-removed', { 
          playerId, 
          playerName: targetPlayer.name,
          removedBy: requestingPlayerId
        });

        // Broadcast updated player selection status to remaining players
        this.broadcastPlayerSelectionStatus(roomId);

        console.log(`Player ${targetPlayer.name} (${playerId}) was removed from room ${roomId} by ${requestingPlayerId}`);
      } else {
        socket.emit('error', { message: 'Failed to remove player from room' });
        console.error(`Failed to remove player ${playerId} from room ${roomId}`);
      }
    } catch (error) {
      console.error('Error handling remove player:', error);
      const errorMessage = error instanceof Error ? error.message : 'Internal server error while removing player';
      socket.emit('error', { message: errorMessage });
    }
  }

  /**
   * Handle client disconnection
   * Requirements: 3.4, 3.5, 6.5
   */
  private handleDisconnect(socket: any): void {
    try {
      const playerId = this.socketPlayerMap.get(socket.id);
      if (playerId) {
        const roomId = playerService.getPlayerRoom(playerId);
        
        // Update player connection status to disconnected
        const updateResult = playerService.updateConnectionStatus(playerId, false);
        
        if (updateResult.success && roomId) {
          // Notify other players in the room about disconnection
          socket.to(roomId).emit('player-left', { playerId });
          
          // Broadcast updated player selection status to remaining players
          this.broadcastPlayerSelectionStatus(roomId);
          
          console.log(`Player ${playerId} disconnected from room ${roomId} - state preserved`);
        }

        // Clean up socket mappings but preserve player state in room
        this.playerSocketMap.delete(playerId);
        this.socketPlayerMap.delete(socket.id);
      } else {
        console.log('Client disconnected:', socket.id);
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  }

  /**
   * Broadcast player selection status updates to all players in a room
   * Requirements: 4.4, 6.2
   */
  private broadcastPlayerSelectionStatus(roomId: string): void {
    try {
      const selectionStatus = estimationService.getPlayerSelectionStatus(roomId);
      this.broadcastToRoom(roomId, 'player-selection-status', { players: selectionStatus });
    } catch (error) {
      console.error('Error broadcasting player selection status:', error);
    }
  }

  /**
   * Broadcast an event to all players in a specific room
   * Requirements: 6.1, 6.2, 6.3, 6.4
   */
  public broadcastToRoom(roomId: string, event: string, data: any): void {
    this.io.to(roomId).emit(event, data);
  }

  /**
   * Send an event to a specific player
   * Requirements: 6.1, 6.2, 6.3, 6.4
   */
  public sendToPlayer(playerId: string, event: string, data: any): void {
    const socketId = this.playerSocketMap.get(playerId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  /**
   * Get connection statistics for monitoring
   * Requirements: 3.4, 3.5, 6.5
   */
  public getConnectionStats(): {
    totalConnections: number;
    playersConnected: number;
    playersDisconnected: number;
    roomConnections: Array<{ roomId: string; playerCount: number; connectedCount: number; disconnectedCount: number }>;
  } {
    const totalConnections = this.io.engine.clientsCount;
    const playersConnected = this.socketPlayerMap.size;
    
    // Group players by room and count connected/disconnected
    const roomStats: { [roomId: string]: { total: number; connected: number; disconnected: number } } = {};
    
    const rooms = roomService.getAllRooms();
    for (const room of rooms) {
      roomStats[room.id] = {
        total: room.players.length,
        connected: room.players.filter(p => p.isConnected).length,
        disconnected: room.players.filter(p => !p.isConnected).length
      };
    }

    const totalDisconnected = Object.values(roomStats).reduce((sum, stats) => sum + stats.disconnected, 0);

    return {
      totalConnections,
      playersConnected,
      playersDisconnected: totalDisconnected,
      roomConnections: Object.entries(roomStats).map(([roomId, stats]) => ({
        roomId,
        playerCount: stats.total,
        connectedCount: stats.connected,
        disconnectedCount: stats.disconnected
      }))
    };
  }

  /**
   * Force disconnect a player (for admin purposes)
   */
  public disconnectPlayer(playerId: string): boolean {
    const socketId = this.playerSocketMap.get(playerId);
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a player is currently connected
   */
  public isPlayerConnected(playerId: string): boolean {
    const socketId = this.playerSocketMap.get(playerId);
    if (!socketId) return false;
    
    const socket = this.io.sockets.sockets.get(socketId);
    return socket ? socket.connected : false;
  }

  /**
   * Get all disconnected players across all rooms
   * Requirements: 3.4, 3.5
   */
  public getDisconnectedPlayers(): Array<{ playerId: string; playerName: string; roomId: string; disconnectedAt: Date }> {
    const disconnectedPlayers: Array<{ playerId: string; playerName: string; roomId: string; disconnectedAt: Date }> = [];
    
    const rooms = roomService.getAllRooms();
    for (const room of rooms) {
      for (const player of room.players) {
        if (!player.isConnected) {
          disconnectedPlayers.push({
            playerId: player.id,
            playerName: player.name,
            roomId: room.id,
            disconnectedAt: new Date() // This would ideally be stored when disconnection happens
          });
        }
      }
    }
    
    return disconnectedPlayers;
  }

  /**
   * Clean up old disconnected players (for maintenance)
   * Requirements: 3.4, 3.5
   */
  public cleanupDisconnectedPlayers(maxDisconnectedTimeMs: number = 24 * 60 * 60 * 1000): number {
    let cleanedCount = 0;
    const cutoffTime = new Date(Date.now() - maxDisconnectedTimeMs);
    
    const rooms = roomService.getAllRooms();
    for (const room of rooms) {
      const disconnectedPlayers = room.players.filter(p => 
        !p.isConnected && p.joinedAt < cutoffTime
      );
      
      for (const player of disconnectedPlayers) {
        try {
          playerService.leaveRoom(player.id);
          cleanedCount++;
          console.log(`Cleaned up disconnected player ${player.name} (${player.id}) from room ${room.id}`);
        } catch (error) {
          console.error(`Failed to cleanup player ${player.id}:`, error);
        }
      }
    }
    
    return cleanedCount;
  }

  /**
   * Restore connection for a specific player (admin function)
   * Requirements: 3.4, 3.5
   */
  public restorePlayerConnection(playerId: string): boolean {
    try {
      const roomId = playerService.getPlayerRoom(playerId);
      if (!roomId) {
        return false;
      }

      const updateResult = playerService.updateConnectionStatus(playerId, true);
      if (updateResult.success) {
        // Notify room about player reconnection
        this.broadcastToRoom(roomId, 'player-joined', {
          player: playerService.getPlayerInRoom(playerId, roomId)!
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error restoring player connection:', error);
      return false;
    }
  }
}