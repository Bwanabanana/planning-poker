import React, { useState } from 'react';
import { Room, RoomManagementProps } from '../types';
import { buildApiUrl } from '../config';

const RoomManagement: React.FC<RoomManagementProps> = ({
  onRoomJoined,
  onJoinRoom
}) => {
  const [roomName, setRoomName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || !playerName.trim()) {
      setError('Room name and player name are required');
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      // Join room directly via WebSocket - will auto-create if doesn't exist
      if (onJoinRoom) {
        onJoinRoom(roomName.trim(), playerName.trim());
      } else {
        // Fallback to API call if WebSocket join not available
        const response = await fetch(buildApiUrl(`/api/rooms/${encodeURIComponent(roomName.trim())}`));
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (response.status === 404) {
            throw new Error('Room not found. Please check the room name and try again.');
          } else {
            throw new Error(errorData.error || `Server error: ${response.status}`);
          }
        }

        const data = await response.json();
        const room: Room = data.room;
        onRoomJoined?.(room);
      }
    } catch (err) {
      console.error('Room join error:', err);
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Unable to connect to server. Please check your internet connection and try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to join room. Please try again.');
      }
    } finally {
      setIsJoining(false);
    }
  };

  // Check for room name and username in URL parameters and auto-join if both present
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomNameFromUrl = urlParams.get('room');
    const usernameFromUrl = urlParams.get('username');
    
    if (roomNameFromUrl) {
      setRoomName(decodeURIComponent(roomNameFromUrl));
    }
    
    if (usernameFromUrl) {
      setPlayerName(decodeURIComponent(usernameFromUrl));
    }
    
    // Auto-join if both parameters are present
    if (roomNameFromUrl && usernameFromUrl && !isJoining) {
      const roomName = decodeURIComponent(roomNameFromUrl).trim();
      const playerName = decodeURIComponent(usernameFromUrl).trim();
      
      // Validate parameters before auto-joining
      if (roomName.length > 0 && roomName.length <= 50 && 
          playerName.length > 0 && playerName.length <= 30) {
        // Small delay to ensure state is updated
        setTimeout(() => {
          handleAutoJoin(roomName, playerName);
        }, 100);
      } else {
        setError('Invalid room name or username in URL parameters');
      }
    }
  }, [isJoining]);

  const handleAutoJoin = (roomName: string, playerName: string) => {
    setIsJoining(true);
    setError('');
    
    try {
      if (onJoinRoom) {
        onJoinRoom(roomName, playerName);
        
        // Clean up URL parameters after successful auto-join attempt
        const url = new URL(window.location.href);
        url.searchParams.delete('room');
        url.searchParams.delete('username');
        window.history.replaceState({}, '', url.toString());
      }
    } catch (err) {
      console.error('Auto-join error:', err);
      setError('Failed to auto-join room. Please try manually.');
      setIsJoining(false);
    }
  };

  return (
    <div className="room-management">
      <div className="room-management__container">
        <h2>Planning Poker</h2>
        
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {isJoining && roomName && playerName && (
          <div className="auto-join-indicator">
            <div className="spinner"></div>
            <p>Auto-joining room "{roomName}" as "{playerName}"...</p>
          </div>
        )}

        <div className="room-form">
          <form onSubmit={handleJoinRoom}>
            <div className="form-group">
              <label htmlFor="room-name">Room Name</label>
              <input
                id="room-name"
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Enter room name"
                disabled={isJoining}
                maxLength={50}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="player-name">Your Name</label>
              <input
                id="player-name"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                disabled={isJoining}
                maxLength={30}
              />
            </div>

            <div className="button-group">
              <button 
                type="submit" 
                disabled={isJoining || !roomName.trim() || !playerName.trim()}
                className="btn btn-primary btn-large"
              >
                {isJoining ? 'Joining...' : 'Join Room'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RoomManagement;