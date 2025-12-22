import React from 'react';
import { PlayerStatusProps } from '../types';

interface ExtendedPlayerStatusProps extends PlayerStatusProps {
  roundState?: 'waiting' | 'active' | 'revealed';
  onRemovePlayer?: (playerId: string) => void;
}

const PlayerStatus: React.FC<ExtendedPlayerStatusProps> = ({
  players,
  cardSelections = {},
  roundState = 'waiting',
  onRemovePlayer
}) => {
  const connectedPlayers = players.filter(player => player.isConnected);
  const disconnectedPlayers = players.filter(player => !player.isConnected);

  const getPlayerStatusIcon = (player: any, hasSelected: boolean) => {
    if (!player.isConnected) {
      return '🔌'; // Disconnected icon
    }
    
    if (hasSelected) {
      return '✅'; // Card selected icon
    }
    
    return '⏳'; // Waiting icon
  };

  const getPlayerStatusText = (player: any, hasSelected: boolean) => {
    if (!player.isConnected) {
      return 'Disconnected';
    }
    
    if (hasSelected) {
      return 'Card selected';
    }
    
    return 'Selecting...';
  };

  const getPlayerClassName = (player: any, hasSelected: boolean) => {
    let className = 'player-status-item';
    
    if (!player.isConnected) {
      className += ' disconnected';
    } else if (hasSelected) {
      className += ' selected';
    } else {
      className += ' waiting';
    }
    
    return className;
  };

  const selectedCount = connectedPlayers.filter(player => 
    cardSelections[player.id] === true
  ).length;

  const totalConnected = connectedPlayers.length;

  return (
    <div className="player-status">
      <div className="player-status__header">
        <h3>Players</h3>
      </div>

      <div className="player-status__content">
        {connectedPlayers.length === 0 && disconnectedPlayers.length === 0 && (
          <div className="empty-state">
            <p>No players in room</p>
          </div>
        )}

        {connectedPlayers.length > 0 && (
          <div className="connected-players">
            <h4 className="section-title">{selectedCount} of {totalConnected} selected</h4>
            <div className="players-list">
              {connectedPlayers.map((player) => {
                const hasSelected = cardSelections[player.id] === true;
                return (
                  <div 
                    key={player.id} 
                    className={getPlayerClassName(player, hasSelected)}
                  >
                    <div className="player-info">
                      <span className="player-name">{player.name}</span>
                      <span className="player-status-text">
                        {getPlayerStatusText(player, hasSelected)}
                      </span>
                    </div>
                    <div className="status-icon">
                      {getPlayerStatusIcon(player, hasSelected)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {disconnectedPlayers.length > 0 && (
          <div className="disconnected-players">
            <h4 className="section-title">Disconnected ({disconnectedPlayers.length})</h4>
            <div className="players-list">
              {disconnectedPlayers.map((player) => (
                <div 
                  key={player.id} 
                  className={getPlayerClassName(player, false)}
                >
                  <div className="player-info">
                    <span className="player-name">{player.name}</span>
                    <span className="player-status-text">
                      {getPlayerStatusText(player, false)}
                    </span>
                  </div>
                  <div className="player-actions">
                    <div className="status-icon">
                      {getPlayerStatusIcon(player, false)}
                    </div>
                    {onRemovePlayer && (
                      <button
                        className="remove-player-btn"
                        onClick={() => onRemovePlayer(player.id)}
                        title={`Remove ${player.name} from room`}
                        aria-label={`Remove ${player.name} from room`}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {totalConnected > 0 && selectedCount === totalConnected && roundState === 'active' && (
        <div className="all-ready-indicator">
          <div className="ready-message">
            <span className="ready-icon">🎉</span>
            <span className="ready-text">All players ready!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerStatus;