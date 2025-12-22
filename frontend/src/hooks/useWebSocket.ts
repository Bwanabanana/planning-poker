import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { WEBSOCKET_URL } from '../config';
import type { 
  Room, 
  Player, 
  EstimationResult,
  CardValue 
} from '../types';

export interface UseWebSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  joinRoom: (roomId: string, playerName: string) => void;
  startRound: () => void;
  selectCard: (cardValue: CardValue) => void;
  revealCards: () => void;
  leaveRoom: () => void;
  removePlayer: (playerId: string) => void;
  disconnect: () => void;
}

export interface UseWebSocketOptions {
  onRoomJoined?: (room: Room) => void;
  onPlayerJoined?: (player: Player) => void;
  onPlayerLeft?: (playerId: string) => void;
  onPlayerRemoved?: (playerId: string, playerName: string) => void;
  onRoundStarted?: () => void;
  onCardSelected?: (playerId: string, hasSelected: boolean) => void;
  onPlayerSelectionStatus?: (players: Array<{
    playerId: string;
    playerName: string;
    hasSelected: boolean;
    isConnected: boolean;
  }>) => void;
  onAllCardsSubmitted?: () => void;
  onCardsRevealed?: (result: EstimationResult) => void;
  onError?: (message: string) => void;
  onConnectionChange?: (connected: boolean) => void;
}

// Use WebSocket URL from configuration
const WEBSOCKET_CONNECTION_URL = WEBSOCKET_URL;

export const useWebSocket = (options: UseWebSocketOptions = {}): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Use refs for callbacks to avoid recreating setupEventListeners
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  // Setup event listeners
  const setupEventListeners = useCallback((socket: Socket) => {
    // Connection events
    socket.on('connect', () => {
      console.log('WebSocket connected with ID:', socket.id);
      console.log('Transport:', socket.io.engine.transport.name);
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
      callbacksRef.current.onConnectionChange?.(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      console.log('Disconnect details:', {
        reason,
        connected: socket.connected,
        id: socket.id,
        transport: socket.io.engine?.transport?.name
      });
      setIsConnected(false);
      callbacksRef.current.onConnectionChange?.(false);
      
      // Socket.IO will handle reconnection automatically
      // No need to call attemptReconnection() manually
    });

    socket.on('connect_error', (error: any) => {
      console.error('WebSocket connection error:', error);
      console.log('Connection error details:', {
        message: error.message,
        description: error.description || 'No description',
        context: error.context || 'No context',
        type: error.type || 'Unknown type'
      });
      setIsConnected(false);
      callbacksRef.current.onConnectionChange?.(false);
      // Socket.IO will handle reconnection automatically
    });

    // Handle when all reconnection attempts are exhausted
    socket.on('reconnect_failed', () => {
      console.log('All reconnection attempts failed, will retry manually');
      setIsConnected(false);
      callbacksRef.current.onConnectionChange?.(false);
      
      // Start manual retry with longer intervals
      const retryConnection = () => {
        if (!socket.connected) {
          console.log('Attempting manual reconnection...');
          socket.connect();
          
          // Retry every 10 seconds if still not connected
          setTimeout(() => {
            if (!socket.connected) {
              retryConnection();
            }
          }, 10000);
        }
      };
      
      // Start manual retry after 5 seconds
      setTimeout(retryConnection, 5000);
    });

    // Handle successful reconnection
    socket.on('reconnect', (attemptNumber) => {
      console.log('Successfully reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      callbacksRef.current.onConnectionChange?.(true);
    });

    // Game events
    socket.on('room-joined', (data) => {
      console.log('Room joined:', data.room);
      // Mark that we've successfully joined
      if (roomStateRef.current) {
        roomStateRef.current.hasJoined = true;
      }
      callbacksRef.current.onRoomJoined?.(data.room);
    });

    socket.on('player-joined', (data) => {
      console.log('Player joined:', data.player);
      callbacksRef.current.onPlayerJoined?.(data.player);
    });

    socket.on('player-left', (data) => {
      console.log('Player left:', data.playerId);
      callbacksRef.current.onPlayerLeft?.(data.playerId);
    });

    socket.on('player-removed', (data) => {
      console.log('Player removed:', data.playerId, data.playerName);
      callbacksRef.current.onPlayerRemoved?.(data.playerId, data.playerName);
    });

    socket.on('round-started', () => {
      console.log('Round started');
      callbacksRef.current.onRoundStarted?.();
    });

    socket.on('card-selected', (data) => {
      console.log('Card selected:', data);
      callbacksRef.current.onCardSelected?.(data.playerId, data.hasSelected);
    });

    socket.on('player-selection-status', (data) => {
      console.log('Player selection status:', data);
      callbacksRef.current.onPlayerSelectionStatus?.(data.players);
    });

    socket.on('all-cards-submitted', () => {
      console.log('All cards submitted');
      callbacksRef.current.onAllCardsSubmitted?.();
    });

    socket.on('cards-revealed', (data) => {
      console.log('Cards revealed:', data.result);
      callbacksRef.current.onCardsRevealed?.(data.result);
    });

    socket.on('error', (data) => {
      console.error('WebSocket error:', data.message);
      callbacksRef.current.onError?.(data.message);
    });
  }, []); // Empty dependency array since we use refs for callbacks

  // Store room and player state for reconnection
  const roomStateRef = useRef<{
    roomId?: string;
    playerName?: string;
    hasJoined?: boolean; // Track if we've successfully joined
  }>({});

  // Enhanced join room with state storage for reconnection
  const joinRoom = useCallback((roomId: string, playerName: string) => {
    console.log('joinRoom called with:', roomId, playerName);
    console.log('Socket connected:', socketRef.current?.connected);
    
    if (socketRef.current?.connected) {
      console.log('Joining room:', roomId, 'as:', playerName);
      
      // Validate inputs
      if (!roomId.trim() || !playerName.trim()) {
        callbacksRef.current.onError?.('Room ID and player name are required');
        return;
      }
      
      // Store state for potential reconnection
      roomStateRef.current = { 
        roomId: roomId.trim(), 
        playerName: playerName.trim(),
        hasJoined: false // Will be set to true when room-joined event is received
      };
      
      try {
        console.log('Emitting join-room event');
        socketRef.current.emit('join-room', { roomId: roomId.trim(), playerName: playerName.trim() });
      } catch (error) {
        console.error('Error emitting join-room event:', error);
        callbacksRef.current.onError?.('Failed to join room. Please try again.');
      }
    } else {
      console.warn('Cannot join room: WebSocket not connected');
      callbacksRef.current.onError?.('Not connected to server. Please wait for connection or refresh the page.');
    }
  }, []);

  // Auto-rejoin room on reconnection
  useEffect(() => {
    // Only attempt rejoin if:
    // 1. We're connected
    // 2. We have room state
    // 3. We had previously joined successfully (this indicates it's a reconnection, not initial connection)
    if (isConnected && 
        roomStateRef.current.roomId && 
        roomStateRef.current.playerName && 
        roomStateRef.current.hasJoined) {
      
      console.log('Reconnected - attempting to rejoin room:', roomStateRef.current.roomId);
      
      // Reset the hasJoined flag to prevent multiple rejoins
      roomStateRef.current.hasJoined = false;
      
      // Small delay to ensure server is ready
      setTimeout(() => {
        if (socketRef.current?.connected && roomStateRef.current.roomId && roomStateRef.current.playerName) {
          console.log('Auto-rejoining room after reconnection');
          socketRef.current.emit('join-room', {
            roomId: roomStateRef.current.roomId,
            playerName: roomStateRef.current.playerName
          });
        }
      }, 1000); // Increased delay to 1 second for server stability
    }
  }, [isConnected]);

  // Initialize WebSocket connection
  useEffect(() => {
    console.log('Initializing WebSocket connection to:', WEBSOCKET_CONNECTION_URL);
    
    const socket = io(WEBSOCKET_CONNECTION_URL, {
      autoConnect: true,
      reconnection: true, // Enable auto-reconnection
      reconnectionAttempts: 10, // Increase attempts to 10
      reconnectionDelay: 1000, // Start with 1 second delay
      reconnectionDelayMax: 5000, // Max 5 seconds between attempts
      randomizationFactor: 0.5, // Add some randomization to avoid thundering herd
      timeout: 10000,
      transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
      path: '/socket.io',
    });

    socketRef.current = socket;
    setupEventListeners(socket);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [setupEventListeners]);

  const startRound = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('Starting round');
      try {
        socketRef.current.emit('start-round', {});
      } catch (error) {
        console.error('Error starting round:', error);
        callbacksRef.current.onError?.('Failed to start round. Please try again.');
      }
    } else {
      console.warn('Cannot start round: WebSocket not connected');
      callbacksRef.current.onError?.('Not connected to server. Please wait for connection or refresh the page.');
    }
  }, []);

  const selectCard = useCallback((cardValue: CardValue) => {
    if (socketRef.current?.connected) {
      console.log('Selecting card:', cardValue);
      try {
        socketRef.current.emit('select-card', { cardValue });
      } catch (error) {
        console.error('Error selecting card:', error);
        callbacksRef.current.onError?.('Failed to select card. Please try again.');
      }
    } else {
      console.warn('Cannot select card: WebSocket not connected');
      callbacksRef.current.onError?.('Not connected to server. Please wait for connection or refresh the page.');
    }
  }, []);

  const revealCards = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('Revealing cards');
      try {
        socketRef.current.emit('reveal-cards', {});
      } catch (error) {
        console.error('Error revealing cards:', error);
        callbacksRef.current.onError?.('Failed to reveal cards. Please try again.');
      }
    } else {
      console.warn('Cannot reveal cards: WebSocket not connected');
      callbacksRef.current.onError?.('Not connected to server. Please wait for connection or refresh the page.');
    }
  }, []);

  const leaveRoom = useCallback(() => {
    // Notify backend that we're leaving the room
    if (socketRef.current?.connected && roomStateRef.current.roomId) {
      console.log('Emitting leave-room event');
      try {
        socketRef.current.emit('leave-room');
      } catch (error) {
        console.error('Error emitting leave-room event:', error);
      }
    }
    
    // Clear stored room state but keep socket alive
    roomStateRef.current = {};
    
    // Don't disconnect the socket, just clear room-related state
    // The socket stays connected for future room joins
  }, []);

  const removePlayer = useCallback((playerId: string) => {
    if (socketRef.current?.connected) {
      console.log('Removing player:', playerId);
      try {
        socketRef.current.emit('remove-player', { playerId });
      } catch (error) {
        console.error('Error removing player:', error);
        callbacksRef.current.onError?.('Failed to remove player. Please try again.');
      }
    } else {
      console.warn('Cannot remove player: WebSocket not connected');
      callbacksRef.current.onError?.('Not connected to server. Please wait for connection or refresh the page.');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    // Clear stored room state
    roomStateRef.current = {};
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setIsConnected(false);
    callbacksRef.current.onConnectionChange?.(false);
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    joinRoom,
    startRound,
    selectCard,
    revealCards,
    leaveRoom,
    removePlayer,
    disconnect
  };
};