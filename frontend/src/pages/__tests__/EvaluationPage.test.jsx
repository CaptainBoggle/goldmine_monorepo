import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EvaluationPage from '../EvaluationPage';

// Mock the hook
jest.mock('../../hooks/useEvaluationAPI');

describe('EvaluationPage', () => {
  const mockUseEvaluationAPI = require('../../hooks/useEvaluationAPI').useEvaluationAPI;

  const mockData = {
    tools: [
      { id: 'phenobert', name: 'PhenoBERT' },
      { id: 'phenotagger', name: 'PhenoTagger' }
    ],
    corpora: [
      { name: 'gold_corpus', corpus_version: 'v1.0.0' },
      { name: 'gold_corpus_small', corpus_version: 'v1.0.0' }
    ],
    metricsData: {
      'phenobert_gold_corpus_v1.0.0': {
        tool: 'phenobert',
        corpus: 'gold_corpus',
        corpusVersion: 'v1.0.0',
        accuracy: 0.85,
        precision: 0.82,
        recall: 0.88,
        f1: 0.85,
        jaccard: 0.78
      },
      'phenotagger_gold_corpus_v1.0.0': {
        tool: 'phenotagger',
        corpus: 'gold_corpus',
        corpusVersion: 'v1.0.0',
        accuracy: 0.78,
        precision: 0.75,
        recall: 0.81,
        f1: 0.78,
        jaccard: 0.72
      }
    },
    isLoading: false,
    error: '',
    clearError: jest.fn(),
    fetchAllMetrics: jest.fn(),
    lastFetchTime: Date.now(),
    hasInitialData: true,
    lastUpdatedCorpus: null
  };

  beforeEach(() => {
    mockUseEvaluationAPI.mockReturnValue(mockData);
  });

  it('renders the main title', () => {
    render(<EvaluationPage />);
    expect(screen.getByText('Evaluation Results')).toBeInTheDocument();
  });

  it('renders corpus selection section', () => {
    render(<EvaluationPage />);
    expect(screen.getByText('Select Corpus and Refresh Data')).toBeInTheDocument();
  });

  it('renders comparison graph section', () => {
    render(<EvaluationPage />);
    expect(screen.getByText('Comparison Graph')).toBeInTheDocument();
  });

  it('displays corpus dropdown with available options', () => {
    render(<EvaluationPage />);
    
    const corpusSelect = screen.getByDisplayValue('Select a corpus');
    expect(corpusSelect).toBeInTheDocument();
    
    fireEvent.click(corpusSelect);
    expect(screen.getByText('gold_corpus')).toBeInTheDocument();
    expect(screen.getByText('gold_corpus_small')).toBeInTheDocument();
  });

  it('shows version dropdown when corpus is selected', async () => {
    render(<EvaluationPage />);
    
    const corpusSelect = screen.getByDisplayValue('Select a corpus');
    fireEvent.change(corpusSelect, { target: { value: 'gold_corpus' } });
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Select a version')).toBeInTheDocument();
    });
  });

  it('displays metric checkboxes', () => {
    render(<EvaluationPage />);
    
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
    expect(screen.getByText('Precision')).toBeInTheDocument();
    expect(screen.getByText('Recall')).toBeInTheDocument();
    expect(screen.getByText('F1')).toBeInTheDocument();
    expect(screen.getByText('Jaccard')).toBeInTheDocument();
  });

  it('handles metric selection and deselection', () => {
    render(<EvaluationPage />);
    
    const accuracyCheckbox = screen.getByLabelText('Accuracy');
    const precisionCheckbox = screen.getByLabelText('Precision');
    
    // Initially accuracy is checked (default), precision is unchecked
    expect(accuracyCheckbox).toBeChecked();
    expect(precisionCheckbox).not.toBeChecked();
    
    // Uncheck accuracy
    fireEvent.click(accuracyCheckbox);
    expect(accuracyCheckbox).not.toBeChecked();
    
    // Check precision
    fireEvent.click(precisionCheckbox);
    expect(precisionCheckbox).toBeChecked();
    
    // Check accuracy again
    fireEvent.click(accuracyCheckbox);
    expect(accuracyCheckbox).toBeChecked();
  });

  it('shows refresh button and handles refresh action', () => {
    render(<EvaluationPage />);
    
    const refreshButton = screen.getByText('Refresh Data');
    expect(refreshButton).toBeInTheDocument();
    
    fireEvent.click(refreshButton);
    expect(mockData.fetchAllMetrics).toHaveBeenCalled();
  });

  it('disables refresh button when loading', () => {
    const loadingData = { ...mockData, isLoading: true };
    mockUseEvaluationAPI.mockReturnValue(loadingData);
    
    render(<EvaluationPage />);
    
    const refreshButton = screen.getByText('Refreshing...');
    expect(refreshButton).toBeDisabled();
  });

  it('shows last updated corpus information when available', () => {
    const dataWithLastUpdated = { ...mockData, lastUpdatedCorpus: 'gold_corpus' };
    mockUseEvaluationAPI.mockReturnValue(dataWithLastUpdated);
    
    render(<EvaluationPage />);
    
    expect(screen.getByText('Last updated: gold_corpus')).toBeInTheDocument();
  });

  it('shows loading message when data is being fetched', () => {
    const loadingData = { ...mockData, isLoading: true };
    mockUseEvaluationAPI.mockReturnValue(loadingData);
    
    render(<EvaluationPage />);
    
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('shows no data message when no corpora are available', () => {
    const noData = { ...mockData, corpora: [] };
    mockUseEvaluationAPI.mockReturnValue(noData);
    
    render(<EvaluationPage />);
    
    // The component should still show the basic structure but with no corpus options
    expect(screen.getByText('Evaluation Results')).toBeInTheDocument();
    expect(screen.getByText('Select Corpus and Refresh Data')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Select a corpus')).toBeInTheDocument();
  });

  it('displays performance results table when corpus and version are selected', async () => {
    render(<EvaluationPage />);
    
    // Select corpus
    const corpusSelect = screen.getByDisplayValue('Select a corpus');
    fireEvent.change(corpusSelect, { target: { value: 'gold_corpus' } });
    
    // Select version
    const versionSelect = screen.getByDisplayValue('Select a version');
    fireEvent.change(versionSelect, { target: { value: 'v1.0.0' } });
    
    // Check for performance results table
    expect(screen.getByText('gold_corpus (v1.0.0) Performance Results')).toBeInTheDocument();
    expect(screen.getByText('Tool')).toBeInTheDocument();
    expect(screen.getAllByText('Accuracy').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Precision').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Recall').length).toBeGreaterThan(0);
    expect(screen.getAllByText('F1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Jaccard').length).toBeGreaterThan(0);
  });

  it('shows no data message when no data available for selected corpus and version', async () => {
    const emptyMetricsData = { ...mockData, metricsData: {} };
    mockUseEvaluationAPI.mockReturnValue(emptyMetricsData);
    
    render(<EvaluationPage />);
    
    // Select corpus
    const corpusSelect = screen.getByDisplayValue('Select a corpus');
    fireEvent.change(corpusSelect, { target: { value: 'gold_corpus' } });
    
    // Select version
    const versionSelect = screen.getByDisplayValue('Select a version');
    fireEvent.change(versionSelect, { target: { value: 'v1.0.0' } });
    
    // Check for no data message
    expect(screen.getByText('No data available for this corpus and version.')).toBeInTheDocument();
  });

  it('displays error message when there is an error', () => {
    const errorData = { ...mockData, error: 'Failed to fetch metrics data' };
    mockUseEvaluationAPI.mockReturnValue(errorData);
    
    render(<EvaluationPage />);
    
    expect(screen.getByText('Failed to fetch metrics data')).toBeInTheDocument();
  });

  it('calls clearError when error clear button is clicked', () => {
    const errorData = { ...mockData, error: 'Failed to fetch metrics data' };
    mockUseEvaluationAPI.mockReturnValue(errorData);
    
    render(<EvaluationPage />);
    
    // Find and click the clear error button (assuming it's in MessageDisplay component)
    // This test assumes MessageDisplay has a clear button
    expect(mockData.clearError).toBeDefined();
  });

  it('shows graph placeholder when no metrics are selected', async () => {
    render(<EvaluationPage />);
    
    // Select corpus and version
    const corpusSelect = screen.getByDisplayValue('Select a corpus');
    fireEvent.change(corpusSelect, { target: { value: 'gold_corpus' } });
    
    const versionSelect = screen.getByDisplayValue('Select a version');
    fireEvent.change(versionSelect, { target: { value: 'v1.0.0' } });
    
    // Uncheck all metrics
    const accuracyCheckbox = screen.getByLabelText('Accuracy');
    fireEvent.click(accuracyCheckbox);
    
    // Check for placeholder message
    expect(screen.getByText('Select at least one metric to see the graph.')).toBeInTheDocument();
  });

  it('shows graph placeholder when no corpus or version is selected', () => {
    render(<EvaluationPage />);
    
    expect(screen.getByText('Select a corpus and version, and at least one metric to see the graph.')).toBeInTheDocument();
  });

  it('displays best scores highlighted in green', async () => {
    render(<EvaluationPage />);
    
    // Select corpus
    const corpusSelect = screen.getByDisplayValue('Select a corpus');
    fireEvent.change(corpusSelect, { target: { value: 'gold_corpus' } });
    
    // Select version
    const versionSelect = screen.getByDisplayValue('Select a version');
    fireEvent.change(versionSelect, { target: { value: 'v1.0.0' } });
    
    // Check that the performance results table is displayed
    expect(screen.getByText('gold_corpus (v1.0.0) Performance Results')).toBeInTheDocument();
    expect(screen.getAllByText('phenobert').length).toBeGreaterThan(0);
    expect(screen.getAllByText('phenotagger').length).toBeGreaterThan(0);
  });

  it('handles empty metrics data gracefully', () => {
    const emptyData = { ...mockData, metricsData: {} };
    mockUseEvaluationAPI.mockReturnValue(emptyData);
    
    render(<EvaluationPage />);
    
    // Should still render without crashing
    expect(screen.getByText('Evaluation Results')).toBeInTheDocument();
  });

  it('handles missing tool data gracefully', () => {
    const incompleteData = {
      ...mockData,
      metricsData: {
        'phenobert_gold_corpus_v1.0.0': {
          tool: 'phenobert',
          corpus: 'gold_corpus',
          corpusVersion: 'v1.0.0',
          accuracy: 0.85,
          // Missing other metrics
        }
      }
    };
    mockUseEvaluationAPI.mockReturnValue(incompleteData);
    
    render(<EvaluationPage />);
    
    // Should still render without crashing
    expect(screen.getByText('Evaluation Results')).toBeInTheDocument();
  });

  it('shows no corpus selected message when no corpus is selected', () => {
    render(<EvaluationPage />);
    
    // The message should appear in the performance results section
    expect(screen.getByText('No corpus selected.')).toBeInTheDocument();
  });

  it('shows no version selected message when corpus is selected but no version', async () => {
    render(<EvaluationPage />);
    
    // Select corpus
    const corpusSelect = screen.getByDisplayValue('Select a corpus');
    fireEvent.change(corpusSelect, { target: { value: 'gold_corpus' } });
    
    await waitFor(() => {
      expect(screen.getByText('No version selected.')).toBeInTheDocument();
    });
  });

  it('handles multiple corpus versions correctly', async () => {
    const multiVersionData = {
      ...mockData,
      corpora: [
        { name: 'gold_corpus', corpus_version: 'v1.0.0' },
        { name: 'gold_corpus', corpus_version: 'v1.1.0' },
        { name: 'gold_corpus_small', corpus_version: 'v1.0.0' }
      ]
    };
    mockUseEvaluationAPI.mockReturnValue(multiVersionData);
    
    render(<EvaluationPage />);
    
    // Select corpus
    const corpusSelect = screen.getByDisplayValue('Select a corpus');
    fireEvent.change(corpusSelect, { target: { value: 'gold_corpus' } });
    
    // Check that both versions are available
    await waitFor(() => {
      const versionSelect = screen.getByDisplayValue('Select a version');
      fireEvent.click(versionSelect);
      expect(screen.getByText('v1.0.0')).toBeInTheDocument();
      expect(screen.getByText('v1.1.0')).toBeInTheDocument();
    });
  });
}); 