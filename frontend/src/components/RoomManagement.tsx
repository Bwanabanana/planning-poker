import React, { useState } from 'react';
import { Room, RoomManagementProps } from '../types';
import { buildApiUrl } from '../config';
import { useAutoJoin } from '../hooks/useAutoJoin';

const RoomManagement: React.FC<RoomManagementProps> = ({
  onRoomJoined,
  onJoinRoom,
  isConnected = false
}) => {
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  // Auto-join logic extracted to custom hook
  const {
    roomName,
    playerName,
    isAutoJoining,
    autoJoinError,
    setRoomName,
    setPlayerName
  } = useAutoJoin(onJoinRoom, isJoining, isConnected);

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

  return (
    <div className="room-management">
      <div className="room-management__container">
        <h2>Planning Poker</h2>
        
        {(error || autoJoinError) && (
          <div className="error-message" role="alert">
            {error || autoJoinError}
          </div>
        )}

        {(isAutoJoining || isJoining) && roomName && playerName && (
          <div className="auto-join-indicator">
            <div className="spinner"></div>
            <p>
              {isAutoJoining 
                ? `Auto-joining room "${roomName}" as "${playerName}"...`
                : 'Joining...'
              }
            </p>
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
                disabled={isJoining || isAutoJoining}
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
                disabled={isJoining || isAutoJoining}
                maxLength={30}
              />
            </div>

            <div className="button-group">
              <button 
                type="submit" 
                disabled={isJoining || isAutoJoining || !roomName.trim() || !playerName.trim()}
                className="btn btn-primary btn-large"
              >
                {(isJoining || isAutoJoining) ? 'Joining...' : 'Join Room'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RoomManagement;