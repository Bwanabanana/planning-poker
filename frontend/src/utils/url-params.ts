/**
 * URL parameter utilities
 * Handles URL parameter parsing and cleanup
 */

export interface RoomParams {
  roomName?: string;
  username?: string;
}

/**
 * Parse room and username from URL parameters
 */
export function parseRoomParams(): RoomParams {
  const urlParams = new URLSearchParams(window.location.search);
  
  const roomName = urlParams.get('room');
  const username = urlParams.get('username');
  
  return {
    roomName: roomName ? decodeURIComponent(roomName) : undefined,
    username: username ? decodeURIComponent(username) : undefined
  };
}

/**
 * Validate room parameters for auto-join
 */
export function validateRoomParams(params: RoomParams): {
  isValid: boolean;
  error?: string;
} {
  const { roomName, username } = params;
  
  if (!roomName || !username) {
    return { isValid: false };
  }
  
  if (roomName.length === 0 || roomName.length > 50) {
    return { 
      isValid: false, 
      error: 'Room name must be between 1 and 50 characters' 
    };
  }
  
  if (username.length === 0 || username.length > 30) {
    return { 
      isValid: false, 
      error: 'Username must be between 1 and 30 characters' 
    };
  }
  
  return { isValid: true };
}

/**
 * Clean up URL parameters after successful join
 */
export function cleanupUrlParams(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('room');
  url.searchParams.delete('username');
  window.history.replaceState({}, '', url.toString());
}

/**
 * Check if URL has auto-join parameters
 */
export function hasAutoJoinParams(): boolean {
  const params = parseRoomParams();
  return !!(params.roomName && params.username);
}