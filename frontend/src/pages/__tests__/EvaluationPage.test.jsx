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

  it('calls fetchAllMetrics when refresh button is clicked', () => {
    const mockFetchAllMetrics = jest.fn();
    mockUseEvaluationAPI.mockReturnValue({
      ...mockData,
      fetchAllMetrics: mockFetchAllMetrics
    });

    render(<EvaluationPage />);
    
    const refreshButton = screen.getByText('Refresh Data');
    fireEvent.click(refreshButton);
    
    expect(mockFetchAllMetrics).toHaveBeenCalledTimes(1);
  });

  it('disables refresh button when loading', () => {
    mockUseEvaluationAPI.mockReturnValue({
      ...mockData,
      isLoading: true
    });

    render(<EvaluationPage />);
    
    const refreshButton = screen.getByText('Refreshing...');
    expect(refreshButton).toBeDisabled();
  });

  it('displays error message when error exists', () => {
    const mockClearError = jest.fn();
    mockUseEvaluationAPI.mockReturnValue({
      ...mockData,
      error: 'Test error message',
      clearError: mockClearError
    });

    render(<EvaluationPage />);
    
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('shows performance table when corpus and version are selected', async () => {
    render(<EvaluationPage />);
    
    // Select corpus
    const corpusSelect = screen.getByDisplayValue('Select a corpus');
    fireEvent.change(corpusSelect, { target: { value: 'gold_corpus' } });
    
    // Select version
    await waitFor(() => {
      const versionSelect = screen.getByDisplayValue('Select a version');
      fireEvent.change(versionSelect, { target: { value: 'v1.0.0' } });
    });
    
    // Check if performance table is displayed
    await waitFor(() => {
      expect(screen.getByText('gold_corpus (v1.0.0) Performance Results')).toBeInTheDocument();
      expect(screen.getAllByText('phenobert').length).toBeGreaterThan(0); // In graph and table
      expect(screen.getAllByText('phenotagger').length).toBeGreaterThan(0); // In graph and table
    });
  });

  it('displays correct metric values in table', async () => {
    render(<EvaluationPage />);
    
    // Select corpus and version
    const corpusSelect = screen.getByDisplayValue('Select a corpus');
    fireEvent.change(corpusSelect, { target: { value: 'gold_corpus' } });
    
    await waitFor(() => {
      const versionSelect = screen.getByDisplayValue('Select a version');
      fireEvent.change(versionSelect, { target: { value: 'v1.0.0' } });
    });
    
    // Check metric values - use getAllByText to handle duplicates
    await waitFor(() => {
      const accuracyElements = screen.getAllByText('85.0%');
      expect(accuracyElements.length).toBeGreaterThan(0);
      
      const precisionElements = screen.getAllByText('82.0%');
      expect(precisionElements.length).toBeGreaterThan(0);
      
      const recallElements = screen.getAllByText('88.0%');
      expect(recallElements.length).toBeGreaterThan(0);
      
      const f1Elements = screen.getAllByText('85.0%');
      expect(f1Elements.length).toBeGreaterThan(0);
      
      const jaccardElements = screen.getAllByText('78.0%');
      expect(jaccardElements.length).toBeGreaterThan(0);
    });
  });

  it('shows no data message when no corpus is selected', () => {
    render(<EvaluationPage />);
    
    expect(screen.getByText('No corpus selected.')).toBeInTheDocument();
  });

  it('shows no data message when no version is selected', async () => {
    render(<EvaluationPage />);
    
    // Select corpus but not version
    const corpusSelect = screen.getByDisplayValue('Select a corpus');
    fireEvent.change(corpusSelect, { target: { value: 'gold_corpus' } });
    
    await waitFor(() => {
      expect(screen.getByText('No version selected.')).toBeInTheDocument();
    });
  });
}); 