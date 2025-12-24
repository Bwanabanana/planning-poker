import React from 'react';

interface ErrorBannersProps {
  connectionError: string;
  error: string;
  retryCount: number;
  onDismissConnectionError: () => void;
  onDismissError: () => void;
}

const ErrorBanners: React.FC<ErrorBannersProps> = ({
  connectionError,
  error,
  retryCount,
  onDismissConnectionError,
  onDismissError
}) => {
  return (
    <>
      {/* Connection Error Banner */}
      {connectionError && (
        <div className="connection-error-banner" role="alert">
          <span className="error-icon">🔌</span>
          <span className="error-message">{connectionError}</span>
          {retryCount > 0 && (
            <span className="retry-count">Attempt {retryCount}</span>
          )}
          <button 
            onClick={onDismissConnectionError}
            className="error-dismiss"
            aria-label="Dismiss connection error"
          >
            ×
          </button>
        </div>
      )}

      {/* General Error Banner */}
      {error && !connectionError && (
        <div className="error-banner" role="alert">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
          <button 
            onClick={onDismissError}
            className="error-dismiss"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
};

export default ErrorBanners;