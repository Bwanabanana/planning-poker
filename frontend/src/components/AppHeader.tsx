import React from 'react';
import ConnectionStatus from './ConnectionStatus';

interface AppHeaderProps {
  isConnected: boolean;
  isReconnecting: boolean;
  hasCurrentRoom: boolean;
  onLeaveRoom: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  isConnected,
  isReconnecting,
  hasCurrentRoom,
  onLeaveRoom
}) => {
  return (
    <header className="App-header">
      <div className="header-content">
        <div className="header-title">
          <h1>Planning Poker System</h1>
          <p>Real-time collaborative story point estimation</p>
        </div>
        <div className="header-status">
          <ConnectionStatus 
            isConnected={isConnected} 
            isReconnecting={isReconnecting}
          />
          {hasCurrentRoom && (
            <button 
              onClick={onLeaveRoom}
              className="btn btn-secondary btn-small"
            >
              Leave Room
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;