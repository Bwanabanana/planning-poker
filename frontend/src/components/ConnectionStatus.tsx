import React from 'react';

export interface ConnectionStatusProps {
  isConnected: boolean;
  isReconnecting?: boolean;
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  isReconnecting = false,
  className = ''
}) => {
  const getStatusText = () => {
    if (isReconnecting) {
      return 'Reconnecting...';
    }
    return isConnected ? 'Connected' : 'Disconnected';
  };

  const getStatusClassName = () => {
    let baseClass = 'connection-status';
    
    if (className) {
      baseClass += ` ${className}`;
    }
    
    if (isReconnecting) {
      baseClass += ' reconnecting';
    } else if (isConnected) {
      baseClass += ' connected';
    } else {
      baseClass += ' disconnected';
    }
    
    return baseClass;
  };

  const getStatusIcon = () => {
    if (isReconnecting) {
      return '🔄';
    }
    return isConnected ? '🟢' : '🔴';
  };

  return (
    <div className={getStatusClassName()}>
      <span className="status-icon" aria-hidden="true">
        {getStatusIcon()}
      </span>
      <span className="status-text">
        {getStatusText()}
      </span>
    </div>
  );
};

export default ConnectionStatus;