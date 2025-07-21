import React from 'react';

function PerformanceActionButtons({
  isPredicting,
  isEvaluating,
  selectedTool,
  selectedCorpus,
  selectedCorpusVersion,
  modelStatus,
  onPredict,
  onEvaluate,
  onCancelPredict,
  onCancelEvaluate
}) {
  const isModelReady = modelStatus.includes('ready') || modelStatus.includes('loaded');
  const isSelectionComplete = selectedTool && selectedCorpus && selectedCorpusVersion;

  return (
    <div className="performance-button-group">
      {isPredicting ? (
        <div className="flex gap-2">
          <button
            disabled
            className="performance-button performance-button-primary opacity-50"
          >
            <div className="performance-loading-spinner"></div>
            Predicting...
          </button>
          <button
            onClick={onCancelPredict}
            className="performance-button performance-button-danger"
          >
            Cancel Prediction
          </button>
        </div>
      ) : (
        <button
          onClick={onPredict}
          disabled={isEvaluating || !isSelectionComplete || !isModelReady}
          className="performance-button performance-button-primary"
        >
          Check/Run Predictions
        </button>
      )}
      
      {isEvaluating ? (
        <div className="flex gap-2">
          <button
            disabled
            className="performance-button performance-button-success opacity-50"
          >
            <div className="performance-loading-spinner"></div>
            Calculating...
          </button>
          <button
            onClick={onCancelEvaluate}
            className="performance-button performance-button-danger"
          >
            Cancel Evaluation
          </button>
        </div>
      ) : (
        <button
          onClick={onEvaluate}
          disabled={isPredicting || !isSelectionComplete || !isModelReady}
          className="performance-button performance-button-success"
        >
          Calculate Metrics
        </button>
      )}
    </div>
  );
}

export default PerformanceActionButtons; 