import React from 'react';
import './PerformancePage.css';
import { usePerformanceAPI } from '../hooks/usePerformanceAPI';
import ModelStatusIndicator from '../components/ModelStatusIndicator';
import SelectionForm from '../components/SelectionForm';
import PerformanceActionButtons from '../components/PerformanceActionButtons';
import MetricsDisplay from '../components/MetricsDisplay';
import MessageDisplay from '../components/MessageDisplay';

function PerformancePage() {
  const {
    // State
    tools,
    corpora,
    selectedTool,
    selectedCorpus,
    selectedCorpusVersion,
    isLoading,
    isPredicting,
    isEvaluating,
    metrics,
    error,
    success,
    dataSource,
    modelStatus,
    
    // Setters
    setSelectedTool,
    setSelectedCorpus,
    setSelectedCorpusVersion,
    
    // Actions
    loadModel,
    handlePredict,
    handleEvaluate,
    clearError,
    clearSuccess,
  } = usePerformanceAPI();

  // Check if any operation is running
  const isOperationRunning = isPredicting || isEvaluating;

  return (
    <div className="performance-container">
      <h1 className="performance-title">Model Performance</h1>
      
      {/* Error and Success Messages */}
      <MessageDisplay 
        error={error}
        success={success}
        onClearError={clearError}
        onClearSuccess={clearSuccess}
      />

      <div className="performance-section-list">
        {/* Tool and Corpus Selection */}
        <div className="performance-card">
          <h2 className="performance-section-title">Model and Dataset Selection</h2>
          
          {/* Model Status Indicator */}
          <ModelStatusIndicator
            modelStatus={modelStatus}
            selectedTool={selectedTool}
            onReloadModel={loadModel}
            isOperationRunning={isOperationRunning}
          />
          
          {/* Selection Form */}
          <SelectionForm
            tools={tools}
            corpora={corpora}
            selectedTool={selectedTool}
            selectedCorpus={selectedCorpus}
            selectedCorpusVersion={selectedCorpusVersion}
            onToolChange={setSelectedTool}
            onCorpusChange={setSelectedCorpus}
            onCorpusVersionChange={setSelectedCorpusVersion}
            isOperationRunning={isOperationRunning}
          />
          
          {/* Action Buttons */}
          <PerformanceActionButtons
            isPredicting={isPredicting}
            isEvaluating={isEvaluating}
            selectedTool={selectedTool}
            selectedCorpus={selectedCorpus}
            selectedCorpusVersion={selectedCorpusVersion}
            modelStatus={modelStatus}
            onPredict={handlePredict}
            onEvaluate={handleEvaluate}
          />
        </div>

        {/* Performance Metrics Display */}
        <MetricsDisplay metrics={metrics} dataSource={dataSource} />

        {/* Model Information */}
        <div className="performance-card">
          <h2 className="performance-section-title">Model Information</h2>
          <p className="performance-section-text">
            This performance evaluation system allows you to test and evaluate different phenotype identification models 
            against various corpora. The system calculates standard evaluation metrics including accuracy, precision, 
            recall, and F1 score to provide comprehensive performance insights.
          </p>
        </div>

        {/* Testing Methodology */}
        <div className="performance-card">
          <h2 className="performance-section-title">Testing Methodology</h2>
          <ul className="performance-checklist">
            <li className="performance-checkitem">
              <span className="performance-checkmark">✓</span>
              <span>Select a trained model from the available tools</span>
            </li>
            <li className="performance-checkitem">
              <span className="performance-checkmark">✓</span>
              <span>Choose a corpus with ground truth annotations</span>
            </li>
            <li className="performance-checkitem">
              <span className="performance-checkmark">✓</span>
              <span>Run predictions to generate model outputs</span>
            </li>
            <li className="performance-checkitem">
              <span className="performance-checkmark">✓</span>
              <span>Evaluate performance using standard metrics</span>
            </li>
            <li className="performance-checkitem">
              <span className="performance-checkmark">✓</span>
              <span>Compare results across different models and datasets</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default PerformancePage; 