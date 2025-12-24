/**
 * UI state management hook
 * Extracts UI-related state logic from App component
 */

import { useState } from 'react';

export interface UIStateHook {
  // State
  error: string;
  isReconnecting: boolean;
  isJoining: boolean;
  isLoading: boolean;
  connectionError: string;
  retryCount: number;
  
  // Actions
  setError: (error: string) => void;
  setIsReconnecting: (reconnecting: boolean) => void;
  setIsJoining: (joining: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setConnectionError: (error: string) => void;
  setRetryCount: (count: number | ((prev: number) => number)) => void;
  
  // Computed
  hasError: boolean;
  hasConnectionError: boolean;
}

export function useUIState(): UIStateHook {
  // UI state (not related to room/round state)
  const [error, setError] = useState<string>('');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  
  // Computed values
  const hasError = Boolean(error);
  const hasConnectionError = Boolean(connectionError);
  
  return {
    // State
    error,
    isReconnecting,
    isJoining,
    isLoading,
    connectionError,
    retryCount,
    
    // Actions
    setError,
    setIsReconnecting,
    setIsJoining,
    setIsLoading,
    setConnectionError,
    setRetryCount,
    
    // Computed
    hasError,
    hasConnectionError
  };
}