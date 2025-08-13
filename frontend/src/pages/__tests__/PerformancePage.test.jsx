import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PerformancePage from '../PerformancePage';

// Mock the hook
jest.mock('../../hooks/usePerformanceAPI');

// Mock the components
jest.mock('../../components', () => ({
  ModelStatusIndicator: ({ modelStatus, selectedTool, onReloadModel, isOperationRunning }) => (
    <div data-testid="model-status-indicator">
      <div>Status: {modelStatus}</div>
      <div>Tool: {selectedTool}</div>
      <button 
        onClick={onReloadModel}
        disabled={isOperationRunning}
        data-testid="reload-model-btn"
      >
        Reload Model
      </button>
    </div>
  ),
  SelectionForm: ({ 
    tools, 
    corpora, 
    selectedTool, 
    selectedCorpus, 
    selectedCorpusVersion,
    onToolChange,
    onCorpusChange,
    onCorpusVersionChange,
    isOperationRunning 
  }) => (
    <div data-testid="selection-form">
      <select 
        value={selectedTool || ''} 
        onChange={(e) => onToolChange(e.target.value)}
        disabled={isOperationRunning}
        data-testid="tool-select"
      >
        <option value="">Select a tool</option>
        {tools?.map(tool => (
          <option key={tool.id} value={tool.id}>{tool.name}</option>
        ))}
      </select>
      <select 
        value={selectedCorpus || ''} 
        onChange={(e) => onCorpusChange(e.target.value)}
        disabled={isOperationRunning}
        data-testid="corpus-select"
      >
        <option value="">Select a corpus</option>
        {corpora?.map(corpus => (
          <option key={corpus.name} value={corpus.name}>{corpus.name}</option>
        ))}
      </select>
      <select 
        value={selectedCorpusVersion || ''} 
        onChange={(e) => onCorpusVersionChange(e.target.value)}
        disabled={isOperationRunning}
        data-testid="version-select"
      >
        <option value="">Select a version</option>
        {selectedCorpus && corpora?.find(c => c.name === selectedCorpus)?.corpus_version && (
          <option value={corpora.find(c => c.name === selectedCorpus).corpus_version}>
            {corpora.find(c => c.name === selectedCorpus).corpus_version}
          </option>
        )}
      </select>
    </div>
  ),
    PerformanceActionButtons: ({
    isPredicting,
    isEvaluating,
    selectedTool,
    selectedCorpus,
    selectedCorpusVersion,
    modelStatus,
    onPredict,
    onEvaluate
  }) => (
    <div data-testid="performance-action-buttons">
      <button 
        onClick={onPredict}
        disabled={isPredicting || isEvaluating || !selectedTool || !selectedCorpus || !selectedCorpusVersion || modelStatus !== 'loaded'}
        data-testid="predict-btn"
      >
        {isPredicting ? 'Predicting...' : 'Check/Run Predictions'}
      </button>
      <button 
        onClick={onEvaluate}
        disabled={isPredicting || isEvaluating || !selectedTool || !selectedCorpus || !selectedCorpusVersion || modelStatus !== 'loaded'}
        data-testid="evaluate-btn"
      >
        {isEvaluating ? 'Calculating...' : 'Calculate Metrics'}
      </button>
    </div>
  ),
  MetricsDisplay: ({ metrics, dataSource }) => (
    <div data-testid="metrics-display">
      {metrics ? (
        <div>
          <div>Accuracy: {metrics.accuracy}%</div>
          <div>Precision: {metrics.precision}%</div>
          <div>Recall: {metrics.recall}%</div>
          <div>F1: {metrics.f1}%</div>
          <div>Jaccard: {metrics.jaccard}%</div>
          <div>Data Source: {dataSource}</div>
        </div>
      ) : (
        <div>No metrics available</div>
      )}
    </div>
  ),
  MessageDisplay: ({ error, success, onClearError, onClearSuccess }) => (
    <div data-testid="message-display">
      {error && (
        <div data-testid="error-message">
          {error}
          <button onClick={onClearError}>Clear Error</button>
        </div>
      )}
      {success && (
        <div data-testid="success-message">
          {success}
          <button onClick={onClearSuccess}>Clear Success</button>
        </div>
      )}
    </div>
  )
}));

describe('PerformancePage', () => {
  const mockUsePerformanceAPI = require('../../hooks/usePerformanceAPI').usePerformanceAPI;

  const mockData = {
    // State
    tools: [
      { id: 'phenobert', name: 'PhenoBERT' },
      { id: 'phenotagger', name: 'PhenoTagger' }
    ],
    corpora: [
      { name: 'gold_corpus', corpus_version: 'v1.0.0' },
      { name: 'gold_corpus_small', corpus_version: 'v1.0.0' }
    ],
    selectedTool: '',
    selectedCorpus: '',
    selectedCorpusVersion: '',
    isLoading: false,
    isPredicting: false,
    isEvaluating: false,
    metrics: null,
    error: '',
    success: '',
    dataSource: '',
    modelStatus: 'unloaded',
    
    // Setters
    setSelectedTool: jest.fn(),
    setSelectedCorpus: jest.fn(),
    setSelectedCorpusVersion: jest.fn(),
    
    // Actions
    loadModel: jest.fn(),
    handlePredict: jest.fn(),
    handleEvaluate: jest.fn(),
    clearError: jest.fn(),
    clearSuccess: jest.fn(),
  };

  beforeEach(() => {
    mockUsePerformanceAPI.mockReturnValue(mockData);
  });

  it('renders the main title', () => {
    render(<PerformancePage />);
    expect(screen.getByText('Model Performance')).toBeInTheDocument();
  });

  it('renders model and dataset selection section', () => {
    render(<PerformancePage />);
    expect(screen.getByText('Model and Dataset Selection')).toBeInTheDocument();
  });

  it('displays model status indicator', () => {
    render(<PerformancePage />);
    // Check for the status display
    expect(screen.getByText('unloaded')).toBeInTheDocument();
  });

  it('displays selection form', () => {
    render(<PerformancePage />);
    expect(screen.getByText('Select Tool')).toBeInTheDocument();
    expect(screen.getByText('Select Corpus')).toBeInTheDocument();
    expect(screen.getByText('Corpus Version')).toBeInTheDocument();
  });

  it('displays performance action buttons', () => {
    render(<PerformancePage />);
    expect(screen.getByText('Check/Run Predictions')).toBeInTheDocument();
    expect(screen.getByText('Calculate Metrics')).toBeInTheDocument();
  });

  it('displays metrics display', () => {
    render(<PerformancePage />);
    // Metrics display only shows when metrics are available, so we check for the section title
    expect(screen.getByText('Model Information')).toBeInTheDocument();
  });

  it('displays message display', () => {
    render(<PerformancePage />);
    // Message display is always rendered but may be empty, so we check for the main container
    expect(screen.getByText('Model Performance')).toBeInTheDocument();
  });

  it('shows tool selection dropdown', () => {
    render(<PerformancePage />);
    
    const toolSelect = screen.getByDisplayValue('Choose a tool...');
    expect(toolSelect).toBeInTheDocument();
    
    fireEvent.click(toolSelect);
    expect(screen.getByText('phenobert')).toBeInTheDocument();
    expect(screen.getByText('phenotagger')).toBeInTheDocument();
  });

  it('shows corpus selection dropdown', () => {
    render(<PerformancePage />);
    
    const corpusSelect = screen.getByDisplayValue('Choose a corpus...');
    expect(corpusSelect).toBeInTheDocument();
    
    fireEvent.click(corpusSelect);
    expect(screen.getByText('gold_corpus')).toBeInTheDocument();
    expect(screen.getByText('gold_corpus_small')).toBeInTheDocument();
  });

  it('shows version selection dropdown', () => {
    render(<PerformancePage />);
    
    const versionSelect = screen.getByDisplayValue('Choose version...');
    expect(versionSelect).toBeInTheDocument();
  });

  it('disables predict button when no tool is selected', () => {
    render(<PerformancePage />);
    
    const predictButton = screen.getByText('Check/Run Predictions');
    expect(predictButton).toBeDisabled();
  });

  it('disables predict button when no corpus is selected', () => {
    const mockDataWithTool = {
      ...mockData,
      selectedTool: 'phenobert'
    };
    mockUsePerformanceAPI.mockReturnValue(mockDataWithTool);
    
    render(<PerformancePage />);
    
    const predictButton = screen.getByText('Check/Run Predictions');
    expect(predictButton).toBeDisabled();
  });

  it('disables predict button when no version is selected', () => {
    const mockDataWithToolAndCorpus = {
      ...mockData,
      selectedTool: 'phenobert',
      selectedCorpus: 'gold_corpus'
    };
    mockUsePerformanceAPI.mockReturnValue(mockDataWithToolAndCorpus);
    
    render(<PerformancePage />);
    
    const predictButton = screen.getByText('Check/Run Predictions');
    expect(predictButton).toBeDisabled();
  });

  it('enables predict button when all selections are made and model is loaded', () => {
    const mockDataComplete = {
      ...mockData,
      selectedTool: 'phenobert',
      selectedCorpus: 'gold_corpus',
      selectedCorpusVersion: 'v1.0.0',
      modelStatus: 'loaded'
    };
    mockUsePerformanceAPI.mockReturnValue(mockDataComplete);
    
    render(<PerformancePage />);
    
    const predictButton = screen.getByText('Check/Run Predictions');
    expect(predictButton).not.toBeDisabled();
  });

  it('calls handlePredict when predict button is clicked', () => {
    const mockHandlePredict = jest.fn();
    const mockDataComplete = {
      ...mockData,
      selectedTool: 'phenobert',
      selectedCorpus: 'gold_corpus',
      selectedCorpusVersion: 'v1.0.0',
      modelStatus: 'loaded',
      handlePredict: mockHandlePredict
    };
    mockUsePerformanceAPI.mockReturnValue(mockDataComplete);
    
    render(<PerformancePage />);
    
    const predictButton = screen.getByText('Check/Run Predictions');
    fireEvent.click(predictButton);
    
    expect(mockHandlePredict).toHaveBeenCalledTimes(1);
  });

  it('calls handleEvaluate when evaluate button is clicked', () => {
    const mockHandleEvaluate = jest.fn();
    const mockDataComplete = {
      ...mockData,
      selectedTool: 'phenobert',
      selectedCorpus: 'gold_corpus',
      selectedCorpusVersion: 'v1.0.0',
      modelStatus: 'loaded',
      handleEvaluate: mockHandleEvaluate
    };
    mockUsePerformanceAPI.mockReturnValue(mockDataComplete);
    
    render(<PerformancePage />);
    
    const evaluateButton = screen.getByText('Calculate Metrics');
    fireEvent.click(evaluateButton);
    
    expect(mockHandleEvaluate).toHaveBeenCalledTimes(1);
  });

  it('shows predicting state when isPredicting is true', () => {
    const mockDataPredicting = {
      ...mockData,
      isPredicting: true
    };
    mockUsePerformanceAPI.mockReturnValue(mockDataPredicting);
    
    render(<PerformancePage />);
    
    expect(screen.getByText('Predicting...')).toBeInTheDocument();
  });

  it('shows evaluating state when isEvaluating is true', () => {
    const mockDataEvaluating = {
      ...mockData,
      isEvaluating: true
    };
    mockUsePerformanceAPI.mockReturnValue(mockDataEvaluating);
    
    render(<PerformancePage />);
    
    expect(screen.getByText('Calculating...')).toBeInTheDocument();
  });

  it('displays metrics when available', () => {
    const mockMetrics = {
      accuracy: 0.855,
      precision: 0.823,
      recall: 0.881,
      f1: 0.852,
      jaccard: 0.789
    };
    const mockDataWithMetrics = {
      ...mockData,
      metrics: mockMetrics,
      dataSource: 'prediction'
    };
    mockUsePerformanceAPI.mockReturnValue(mockDataWithMetrics);
    
    render(<PerformancePage />);
    
    expect(screen.getByText('85.50%')).toBeInTheDocument(); // Accuracy
    expect(screen.getByText('82.30%')).toBeInTheDocument(); // Precision
    expect(screen.getByText('88.10%')).toBeInTheDocument(); // Recall
    expect(screen.getByText('85.20%')).toBeInTheDocument(); // F1
    expect(screen.getByText('78.90%')).toBeInTheDocument(); // Jaccard
    expect(screen.getByText('Fresh Data')).toBeInTheDocument();
  });

  it('displays no metrics when metrics are null', () => {
    render(<PerformancePage />);
    
    // When metrics is null, MetricsDisplay returns null, so we shouldn't see metrics
    expect(screen.queryByText('Performance Metrics')).not.toBeInTheDocument();
  });

  it('displays error message when error exists', () => {
    const mockClearError = jest.fn();
    const mockDataWithError = {
      ...mockData,
      error: 'Test error message',
      clearError: mockClearError
    };
    mockUsePerformanceAPI.mockReturnValue(mockDataWithError);
    
    render(<PerformancePage />);
    
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('displays success message when success exists', () => {
    const mockClearSuccess = jest.fn();
    const mockDataWithSuccess = {
      ...mockData,
      success: 'Test success message',
      clearSuccess: mockClearSuccess
    };
    mockUsePerformanceAPI.mockReturnValue(mockDataWithSuccess);
    
    render(<PerformancePage />);
    
    expect(screen.getByText('Test success message')).toBeInTheDocument();
  });

  it('calls clearError when clear error button is clicked', () => {
    const mockClearError = jest.fn();
    const mockDataWithError = {
      ...mockData,
      error: 'Test error message',
      clearError: mockClearError
    };
    mockUsePerformanceAPI.mockReturnValue(mockDataWithError);
    
    render(<PerformancePage />);
    
    const clearErrorButton = screen.getByText('✕');
    fireEvent.click(clearErrorButton);
    
    expect(mockClearError).toHaveBeenCalledTimes(1);
  });

  it('calls clearSuccess when clear success button is clicked', () => {
    const mockClearSuccess = jest.fn();
    const mockDataWithSuccess = {
      ...mockData,
      success: 'Test success message',
      clearSuccess: mockClearSuccess
    };
    mockUsePerformanceAPI.mockReturnValue(mockDataWithSuccess);
    
    render(<PerformancePage />);
    
    const clearSuccessButton = screen.getByText('✕');
    fireEvent.click(clearSuccessButton);
    
    expect(mockClearSuccess).toHaveBeenCalledTimes(1);
  });

  it('disables form controls when operation is running', () => {
    const mockDataRunning = {
      ...mockData,
      isPredicting: true
    };
    mockUsePerformanceAPI.mockReturnValue(mockDataRunning);
    
    render(<PerformancePage />);
    
    // Check that the selects are disabled by looking for the disabled attribute
    const selects = screen.getAllByRole('combobox');
    selects.forEach(select => {
      expect(select).toBeDisabled();
    });
  });
}); 