import React from 'react';
import { EstimationResult } from '../types';

interface ResultsHeaderProps {
  phrase: string;
  hasConsensus: boolean;
  result: EstimationResult;
}

const ResultsHeader: React.FC<ResultsHeaderProps> = ({
  phrase,
  hasConsensus,
  result
}) => {
  return (
    <div className="results-header">
      <h3 className={`results-title ${hasConsensus ? 'consensus-phrase' : ''}`}>
        {phrase}
      </h3>
      {result.statistics.hasVariance && (
        <div className="variance-alert">
          <span className="alert-icon">⚠️</span>
          <span className="alert-text">
            Significant variance detected - consider discussion
          </span>
        </div>
      )}
    </div>
  );
};

export default ResultsHeader;