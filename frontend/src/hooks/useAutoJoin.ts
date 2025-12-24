/**
 * Auto-join hook for URL parameter handling
 * Extracts auto-join logic from RoomManagement component
 */

import { useState, useEffect, useCallback } from 'react';
import { parseRoomParams, validateRoomParams, cleanupUrlParams } from '../utils/url-params';

export interface AutoJoinHook {
  roomName: string;
  playerName: string;
  isAutoJoining: boolean;
  autoJoinError: string;
  setRoomName: (name: string) => void;
  setPlayerName: (name: string) => void;
  setAutoJoinError: (error: string) => void;
}

export function useAutoJoin(
  onJoinRoom?: (roomName: string, playerName: string) => void,
  isJoining?: boolean,
  isConnected?: boolean
): AutoJoinHook {
  const [roomName, setRoomName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isAutoJoining, setIsAutoJoining] = useState(false);
  const [autoJoinError, setAutoJoinError] = useState('');
  
  const handleAutoJoin = useCallback((roomName: string, playerName: string) => {
    setIsAutoJoining(true);
    setAutoJoinError('');
    
    try {
      if (onJoinRoom) {
        onJoinRoom(roomName, playerName);
        cleanupUrlParams();
      }
    } catch (err) {
      console.error('Auto-join error:', err);
      setAutoJoinError('Failed to auto-join room. Please try manually.');
      setIsAutoJoining(false);
    }
  }, [onJoinRoom]);
  
  // Handle URL parameters and auto-join
  useEffect(() => {
    const params = parseRoomParams();
    
    if (params.roomName) {
      setRoomName(params.roomName);
    }
    
    if (params.username) {
      setPlayerName(params.username);
    }
    
    // Auto-join if both parameters are present and not already joining
    if (params.roomName && params.username && !isJoining && !isAutoJoining && isConnected) {
      const validation = validateRoomParams(params);
      
      if (validation.isValid) {
        // Small delay to ensure state is updated
        setTimeout(() => {
          handleAutoJoin(params.roomName!, params.username!);
        }, 100);
      } else {
        setAutoJoinError(validation.error || 'Invalid room name or username in URL parameters');
      }
    }
  }, [isJoining, isAutoJoining, isConnected, handleAutoJoin]);
  
  // Reset auto-joining state when external joining state changes
  useEffect(() => {
    if (!isJoining && isAutoJoining) {
      setIsAutoJoining(false);
    }
  }, [isJoining, isAutoJoining]);
  
  return {
    roomName,
    playerName,
    isAutoJoining,
    autoJoinError,
    setRoomName,
    setPlayerName,
    setAutoJoinError
  };
}