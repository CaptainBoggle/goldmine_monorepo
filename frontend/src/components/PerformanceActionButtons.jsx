import React from 'react';

function PerformanceActionButtons({
  isPredicting,
  isEvaluating,
  selectedTool,
  selectedCorpus,
  selectedCorpusVersion,
  modelStatus,
  onPredict,
  onEvaluate
}) {
  const isModelReady = modelStatus.includes('ready') || modelStatus.includes('loaded');
  const isSelectionComplete = selectedTool && selectedCorpus && selectedCorpusVersion;

  return (
    <div className="performance-button-group">
      <button
        onClick={onPredict}
        disabled={isPredicting || isEvaluating || !isSelectionComplete || !isModelReady}
        className="performance-button performance-button-primary"
      >
        {isPredicting ? (
          <>
            <div className="performance-loading-spinner"></div>
            Predicting...
          </>
        ) : (
          'Check/Run Predictions'
        )}
      </button>
      
      <button
        onClick={onEvaluate}
        disabled={isPredicting || isEvaluating || !isSelectionComplete || !isModelReady}
        className="performance-button performance-button-success"
      >
        {isEvaluating ? (
          <>
            <div className="performance-loading-spinner"></div>
            Calculating...
          </>
        ) : (
          'Calculate Metrics'
        )}
      </button>
    </div>
  );
}

export default PerformanceActionButtons; 