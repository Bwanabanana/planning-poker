import React from 'react';
import RoomManagement from './RoomManagement';
import LoadingOverlay from './LoadingOverlay';
import type { Room } from '../types';

interface RoomSelectionViewProps {
  isJoining: boolean;
  isConnected: boolean;
  onRoomCreated: (room: Room) => Promise<void>;
  onRoomJoined: (room: Room) => Promise<void>;
  onJoinRoom: (roomId: string, playerName: string) => void;
}

const RoomSelectionView: React.FC<RoomSelectionViewProps> = ({
  isJoining,
  isConnected,
  onRoomCreated,
  onRoomJoined,
  onJoinRoom
}) => {
  return (
    <div className="room-selection-view">
      <LoadingOverlay 
        isVisible={isJoining}
        message="Joining room..."
      />
      <RoomManagement
        onRoomCreated={onRoomCreated}
        onRoomJoined={onRoomJoined}
        onJoinRoom={onJoinRoom}
        isConnected={isConnected}
      />
    </div>
  );
};

export default RoomSelectionView;