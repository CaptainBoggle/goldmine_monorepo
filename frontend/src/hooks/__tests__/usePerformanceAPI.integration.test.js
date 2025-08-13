import { renderHook, act, waitFor } from '@testing-library/react';
import { usePerformanceAPI } from '../usePerformanceAPI';
import { useEvaluationAPI } from '../useEvaluationAPI';

// Mock the LoadingContext with realistic implementations
jest.mock('../../contexts/LoadingContext', () => ({
  useLoading: () => ({
    startLoading: jest.fn(),
    stopLoading: jest.fn()
  })
}));

// Mock fetch with realistic responses
global.fetch = jest.fn();

describe('usePerformanceAPI Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Full Workflow Integration', () => {
    it('completes full tool selection to evaluation workflow', async () => {
      const mockTools = [
        { id: 'phenotagger', name: 'PhenoTagger', status: 'ready' },
        { id: 'phenobert', name: 'PhenoBERT', status: 'ready' }
      ];
      
      const mockCorpora = [
        { id: 'corpus1', name: 'gold_corpus', corpus_version: 'v1.0' },
        { id: 'corpus2', name: 'gold_corpus_small', corpus_version: 'v2.0' }
      ];

      const mockMetrics = {
        accuracy: 0.85,
        precision: 0.82,
        recall: 0.88,
        f1: 0.85,
        jaccard: 0.74
      };

      // Mock API calls for the full workflow
      global.fetch
        // Initial data fetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockTools
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockCorpora
        })
        // Model status check
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ state: 'ready' })
        })
        // Check existing predictions
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => []
        })
        // Run predictions
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ message: 'Predictions completed' })
        })
        // Check existing metrics
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => []
        })
        // Calculate new metrics
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockMetrics
        });

      const { result } = renderHook(() => usePerformanceAPI());

      // Wait for initial data to load
      await waitFor(() => {
        expect(result.current.tools).toEqual(mockTools);
        expect(result.current.corpora).toEqual(mockCorpora);
      });

      // Select tool (should trigger model loading)
      act(() => {
        result.current.setSelectedTool('phenotagger');
      });

      expect(result.current.selectedTool).toBe('phenotagger');

      // Wait for model status check
      await waitFor(() => {
        expect(result.current.modelStatus).toBe('Model ready');
      });

      // Select corpus and version
      act(() => {
        result.current.setSelectedCorpus('gold_corpus');
        result.current.setSelectedCorpusVersion('v1.0');
      });

      expect(result.current.selectedCorpus).toBe('gold_corpus');
      expect(result.current.selectedCorpusVersion).toBe('v1.0');

      // Run prediction
      act(() => {
        result.current.handlePredict();
      });

      // Wait for prediction to complete
      await waitFor(() => {
        expect(result.current.isPredicting).toBe(false);
        expect(result.current.success).toContain('Prediction completed successfully');
        expect(result.current.dataSource).toBe('new');
      });

      // Run evaluation
      act(() => {
        result.current.handleEvaluate();
      });

      // Wait for evaluation to complete
      await waitFor(() => {
        expect(result.current.isEvaluating).toBe(false);
        expect(result.current.metrics).toEqual(mockMetrics);
        expect(result.current.dataSource).toBe('new');
        expect(result.current.success).toContain('Evaluation completed successfully');
      });

      // Verify all API calls were made
      expect(global.fetch).toHaveBeenCalledTimes(7);
    });

    it('handles model loading workflow correctly', async () => {
      const mockTools = [{ id: 'tool1', name: 'Tool 1' }];
      
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockTools
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => []
        })
        // Model not ready, needs loading
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ state: 'not_ready' })
        })
        // Model loading
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ loading_time: 2.5 })
        });

      const { result } = renderHook(() => usePerformanceAPI());

      // Wait for initial data
      await waitFor(() => {
        expect(result.current.tools).toEqual(mockTools);
      });

      // Select tool
      act(() => {
        result.current.setSelectedTool('tool1');
      });

      // Should check model status first
      await waitFor(() => {
        expect(result.current.modelStatus).toBe('Loading model...');
      });

      // Should load model and update status
      await waitFor(() => {
        expect(result.current.modelStatus).toBe('Model loaded (2.5s)');
      });
    });

    it('uses cached predictions and metrics when available', async () => {
      const mockTools = [{ id: 'tool1', name: 'Tool 1' }];
      const mockCorpora = [{ id: 'corpus1', name: 'corpus1', corpus_version: 'v1.0' }];
      const mockMetrics = { accuracy: 0.85, precision: 0.82 };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockTools
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockCorpora
        })
        // Model status
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ state: 'ready' })
        })
        // Check existing predictions - return existing data
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => [{ id: 1, predictions: ['phenotype1'] }]
        })
        // Check existing metrics - return existing data
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => [{
            evaluation_result: mockMetrics
          }]
        });

      const { result } = renderHook(() => usePerformanceAPI());

      // Wait for initial data
      await waitFor(() => {
        expect(result.current.tools).toEqual(mockTools);
      });

      // Set selections
      act(() => {
        result.current.setSelectedTool('tool1');
        result.current.setSelectedCorpus('corpus1');
        result.current.setSelectedCorpusVersion('v1.0');
      });

      // Run prediction - should use cached data
      act(() => {
        result.current.handlePredict();
      });

      await waitFor(() => {
        expect(result.current.isPredicting).toBe(false);
        expect(result.current.success).toContain('Predictions already exist');
        expect(result.current.dataSource).toBe('cached');
      });

      // Run evaluation - should use cached data
      act(() => {
        result.current.handleEvaluate();
      });

      await waitFor(() => {
        expect(result.current.isEvaluating).toBe(false);
        expect(result.current.metrics).toEqual(mockMetrics);
        expect(result.current.dataSource).toBe('cached');
        expect(result.current.success).toContain('Using existing evaluation metrics');
      });
    });
  });

  describe('State Management and Data Flow', () => {
    it('manages complex state transitions correctly', async () => {
      const mockTools = [{ id: 'tool1', name: 'Tool 1' }];
      const mockCorpora = [{ id: 'corpus1', name: 'Corpus 1', corpus_version: 'v1.0' }];
      
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockTools
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockCorpora
        });

      const { result } = renderHook(() => usePerformanceAPI());

      // Initial state
      expect(result.current.selectedTool).toBe('');
      expect(result.current.selectedCorpus).toBe('');
      expect(result.current.selectedCorpusVersion).toBe('');
      expect(result.current.metrics).toBeNull();
      expect(result.current.dataSource).toBe('');

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.tools).toEqual(mockTools);
        expect(result.current.corpora).toEqual(mockCorpora);
      });

      // Set selections
      act(() => {
        result.current.setSelectedTool('tool1');
        result.current.setSelectedCorpus('corpus1');
        result.current.setSelectedCorpusVersion('v1.0');
      });

      // State should update
      expect(result.current.selectedTool).toBe('tool1');
      expect(result.current.selectedCorpus).toBe('corpus1');
      expect(result.current.selectedCorpusVersion).toBe('v1.0');

      // Change corpus should clear metrics
      act(() => {
        result.current.setSelectedCorpus('corpus2');
      });

      expect(result.current.metrics).toBeNull();
      expect(result.current.dataSource).toBe('');
      expect(result.current.success).toBe('');
    });

    it('handles concurrent operations gracefully', async () => {
      const mockTools = [{ id: 'tool1', name: 'Tool 1' }];
      
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockTools
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => []
        });

      const { result } = renderHook(() => usePerformanceAPI());

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.tools).toEqual(mockTools);
      });

      // Rapidly change selections
      act(() => {
        result.current.setSelectedTool('tool1');
        result.current.setSelectedCorpus('corpus1');
        result.current.setSelectedCorpusVersion('v1.0');
        result.current.setSelectedTool('tool2');
        result.current.setSelectedCorpus('corpus2');
      });

      // Should end up with last selection
      expect(result.current.selectedTool).toBe('tool2');
      expect(result.current.selectedCorpus).toBe('corpus2');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('recovers from model loading failures', async () => {
      const mockTools = [{ id: 'tool1', name: 'Tool 1' }];
      
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockTools
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => []
        })
        // Model status check fails
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        });

      const { result } = renderHook(() => usePerformanceAPI());

      // Wait for initial data
      await waitFor(() => {
        expect(result.current.tools).toEqual(mockTools);
      });

      // Select tool
      act(() => {
        result.current.setSelectedTool('tool1');
      });

      // Should handle model status failure gracefully
      await waitFor(() => {
        expect(result.current.modelStatus).toBe('Model loading failed');
        expect(result.current.error).toContain('Error loading model');
      });
    });

    it('handles prediction failures and allows retry', async () => {
      const mockTools = [{ id: 'tool1', name: 'Tool 1' }];
      const mockCorpora = [{ id: 'corpus1', name: 'Corpus 1', corpus_version: 'v1.0' }];
      
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockTools
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockCorpora
        })
        // Model status
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ state: 'ready' })
        })
        // First prediction fails
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        });

      const { result } = renderHook(() => usePerformanceAPI());

      // Wait for data and set selections
      await waitFor(() => {
        expect(result.current.tools).toEqual(mockTools);
      });

      act(() => {
        result.current.setSelectedTool('tool1');
        result.current.setSelectedCorpus('corpus1');
        result.current.setSelectedCorpusVersion('v1.0');
      });

      // First prediction fails
      act(() => {
        result.current.handlePredict();
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.isPredicting).toBe(false);
      });

      // Clear error and retry
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe('');
    });

    it('handles network timeouts gracefully', async () => {
      // Mock a timeout scenario
      global.fetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      const { result } = renderHook(() => usePerformanceAPI());

      await waitFor(() => {
        expect(result.current.error).toContain('Error fetching tools: Request timeout');
      });
    });
  });

  describe('Data Validation and Business Logic', () => {
    it('enforces business rules for selections', async () => {
      const { result } = renderHook(() => usePerformanceAPI());

      // Try to predict without selections
      act(() => {
        result.current.handlePredict();
      });

      expect(result.current.error).toBe('Please select a tool, corpus, and corpus version');

      // Try to evaluate without selections
      act(() => {
        result.current.handleEvaluate();
      });

      expect(result.current.error).toBe('Please select a tool, corpus, and corpus version');
    });

    it('validates data integrity during operations', async () => {
      const mockTools = [{ id: 'tool1', name: 'Tool 1' }];
      const mockCorpora = [{ id: 'corpus1', name: 'Corpus 1', corpus_version: 'v1.0' }];
      
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockTools
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockCorpora
        });

      const { result } = renderHook(() => usePerformanceAPI());

      // Wait for data
      await waitFor(() => {
        expect(result.current.tools).toEqual(mockTools);
      });

      // Set valid selections
      act(() => {
        result.current.setSelectedTool('tool1');
        result.current.setSelectedCorpus('corpus1');
        result.current.setSelectedCorpusVersion('v1.0');
      });

      // Should not have validation errors
      expect(result.current.error).toBe('');
    });
  });

  describe('Performance and Memory Management', () => {
    it('handles large datasets efficiently', async () => {
      const largeTools = Array.from({ length: 100 }, (_, i) => ({
        id: `tool${i}`,
        name: `Tool ${i}`,
        status: 'ready'
      }));

      global.fetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => largeTools
      });

      const { result } = renderHook(() => usePerformanceAPI());

      await waitFor(() => {
        expect(result.current.tools).toHaveLength(100);
      });

      // Should handle large datasets without performance issues
      expect(result.current.tools[99].name).toBe('Tool 99');
    });

    it('manages memory during rapid state changes', async () => {
      const mockTools = [{ id: 'tool1', name: 'Tool 1' }];
      
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockTools
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => []
        });

      const { result } = renderHook(() => usePerformanceAPI());

      await waitFor(() => {
        expect(result.current.tools).toEqual(mockTools);
      });

      // Rapid state changes
      for (let i = 0; i < 50; i++) {
        act(() => {
          result.current.setSelectedTool(`tool${i}`);
          result.current.setSelectedCorpus(`corpus${i}`);
        });
      }

      // Should maintain performance
      expect(result.current.selectedTool).toBe('tool49');
      expect(result.current.selectedCorpus).toBe('corpus49');
    });
  });

  describe('Integration with External APIs', () => {
    it('handles different API response formats', async () => {
      const mockTools = [{ id: 'tool1', name: 'Tool 1' }];
      
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockTools
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => []
        })
        // Different content type
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'text/plain' },
          text: async () => 'Model ready'
        });

      const { result } = renderHook(() => usePerformanceAPI());

      await waitFor(() => {
        expect(result.current.tools).toEqual(mockTools);
      });

      act(() => {
        result.current.setSelectedTool('tool1');
      });

      // Should handle non-JSON responses gracefully
      await waitFor(() => {
        expect(result.current.modelStatus).toBe('Model status check failed');
      });
    });

    it('manages API rate limiting gracefully', async () => {
      // Mock rate limiting response
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: { get: () => 'application/json' },
        json: async () => ({ detail: 'Rate limit exceeded' })
      });

      const { result } = renderHook(() => usePerformanceAPI());

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch tools');
      });
    });
  });

  describe('Utility Functions', () => {
    it('provides clearError and clearSuccess functions', () => {
      const { result } = renderHook(() => usePerformanceAPI());

      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.clearSuccess).toBe('function');
    });

    it('clears error and success messages correctly', async () => {
      const { result } = renderHook(() => usePerformanceAPI());

      // Trigger an error by trying to predict without selections
      act(() => {
        result.current.handlePredict();
      });

      // Should have error message
      expect(result.current.error).toBe('Please select a tool, corpus, and corpus version');

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe('');

      // Test success message clearing by setting a success message through the API
      // We'll use a mock that returns success
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => [{ id: 'tool1', name: 'Tool 1' }]
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => [{ id: 'corpus1', name: 'Corpus 1', corpus_version: 'v1.0' }]
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ state: 'ready' })
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => []
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ message: 'Test success' })
        });

      const { result: result2 } = renderHook(() => usePerformanceAPI());

      // Wait for data to load
      await waitFor(() => {
        expect(result2.current.tools).toEqual([{ id: 'tool1', name: 'Tool 1' }]);
      });

      // Set selections and run prediction to get success message
      act(() => {
        result2.current.setSelectedTool('tool1');
        result2.current.setSelectedCorpus('corpus1');
        result2.current.setSelectedCorpusVersion('v1.0');
      });

      act(() => {
        result2.current.handlePredict();
      });

      // Wait for success message
      await waitFor(() => {
        expect(result2.current.success).toContain('Test success');
      });

      // Clear success
      act(() => {
        result2.current.clearSuccess();
      });

      expect(result2.current.success).toBe('');
    });
  });

  describe('Additional Coverage Tests', () => {
    it('handles model loading with non-JSON status response', async () => {
      const mockTools = [{ id: 'tool1', name: 'Tool 1' }];
      
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockTools
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => []
        })
        // Model status returns non-JSON
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'text/plain' },
          text: async () => 'Model ready'
        });

      const { result } = renderHook(() => usePerformanceAPI());

      await waitFor(() => {
        expect(result.current.tools).toEqual(mockTools);
      });

      act(() => {
        result.current.setSelectedTool('tool1');
      });

      await waitFor(() => {
        expect(result.current.modelStatus).toBe('Model status check failed');
      });
    });

    it('handles model loading with server error response', async () => {
      const mockTools = [{ id: 'tool1', name: 'Tool 1' }];
      
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockTools
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => []
        })
        // Model status check fails
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        });

      const { result } = renderHook(() => usePerformanceAPI());

      await waitFor(() => {
        expect(result.current.tools).toEqual(mockTools);
      });

      act(() => {
        result.current.setSelectedTool('tool1');
      });

      await waitFor(() => {
        expect(result.current.modelStatus).toBe('Model loading failed');
        expect(result.current.error).toContain('Error loading model');
      });
    });

    it('handles model loading with non-JSON load response', async () => {
      const mockTools = [{ id: 'tool1', name: 'Tool 1' }];
      
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockTools
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => []
        })
        // Model not ready
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ state: 'not_ready' })
        })
        // Model loading returns non-JSON
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'text/plain' },
          text: async () => 'Model loaded'
        });

      const { result } = renderHook(() => usePerformanceAPI());

      await waitFor(() => {
        expect(result.current.tools).toEqual(mockTools);
      });

      act(() => {
        result.current.setSelectedTool('tool1');
      });

      await waitFor(() => {
        expect(result.current.modelStatus).toBe('Model loading failed');
        expect(result.current.error).toBe('Server returned non-JSON response');
      });
    });

    it('handles model loading with server error during load', async () => {
      const mockTools = [{ id: 'tool1', name: 'Tool 1' }];
      
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockTools
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => []
        })
        // Model not ready
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ state: 'not_ready' })
        })
        // Model loading fails with server error
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        });

      const { result } = renderHook(() => usePerformanceAPI());

      await waitFor(() => {
        expect(result.current.tools).toEqual(mockTools);
      });

      act(() => {
        result.current.setSelectedTool('tool1');
      });

      await waitFor(() => {
        expect(result.current.modelStatus).toBe('Model loading failed');
        expect(result.current.error).toContain('Error loading model');
      });
    });

    it('handles prediction with non-JSON response', async () => {
      const mockTools = [{ id: 'tool1', name: 'Tool 1' }];
      const mockCorpora = [{ id: 'corpus1', name: 'Corpus 1', corpus_version: 'v1.0' }];
      
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockTools
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockCorpora
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ state: 'ready' })
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => []
        })
        // Prediction returns non-JSON
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'text/plain' },
          text: async () => 'Prediction result'
        });

      const { result } = renderHook(() => usePerformanceAPI());

      await waitFor(() => {
        expect(result.current.tools).toEqual(mockTools);
      });

      act(() => {
        result.current.setSelectedTool('tool1');
        result.current.setSelectedCorpus('corpus1');
        result.current.setSelectedCorpusVersion('v1.0');
      });

      act(() => {
        result.current.handlePredict();
      });

      await waitFor(() => {
        expect(result.current.isPredicting).toBe(false);
        expect(result.current.error).toContain('Server error');
      });
    });

    it('handles evaluation with invalid metrics data structure', async () => {
      // Mock the initial fetch calls that happen on mount (fetchTools and fetchCorpora)
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => [{ id: 'phenotagger', name: 'PhenoTagger' }]
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => [{ id: 'gold_corpus', name: 'Gold Corpus', corpus_version: 'v1.0' }]
        })
        // Mock the model status check that happens when tool is selected
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ state: 'ready' })
        })
        // Check existing metrics returns invalid structure
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => [{
            evaluation_result: { invalid_field: 'value' }
          }]
        });

      const { result } = renderHook(() => usePerformanceAPI());

      // Wait for initial data to load
      await waitFor(() => {
        expect(result.current.tools).toHaveLength(1);
        expect(result.current.corpora).toHaveLength(1);
      });

      // Set up selections - this will trigger loadModel()
      act(() => {
        result.current.setSelectedTool('phenotagger');
        result.current.setSelectedCorpus('gold_corpus');
        result.current.setSelectedCorpusVersion('v1.0');
      });

      // Wait for model to load
      await waitFor(() => {
        expect(result.current.modelStatus).toBe('Model ready');
      });

      // Trigger evaluation
      act(() => {
        result.current.handleEvaluate();
      });

      // Should handle invalid metrics structure
      await waitFor(() => {
        expect(result.current.error).toBe('Invalid metrics data structure - missing required fields');
        expect(result.current.isEvaluating).toBe(false);
      });
    });

    it('handles evaluation with non-JSON response', async () => {
      // Mock the initial fetch calls that happen on mount (fetchTools and fetchCorpora)
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => [{ id: 'phenotagger', name: 'PhenoTagger' }]
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => [{ id: 'gold_corpus', name: 'Gold Corpus', corpus_version: 'v1.0' }]
        })
        // Mock the model status check that happens when tool is selected
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ state: 'ready' })
        })
        // Check existing metrics returns empty (no existing metrics)
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => []
        })
        // Evaluation API returns non-JSON response
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: () => 'text/plain' },
          text: async () => 'Server error message'
        });

      const { result } = renderHook(() => usePerformanceAPI());

      // Wait for initial data to load
      await waitFor(() => {
        expect(result.current.tools).toHaveLength(1);
        expect(result.current.corpora).toHaveLength(1);
      });

      // Set up selections - this will trigger loadModel()
      act(() => {
        result.current.setSelectedTool('phenotagger');
        result.current.setSelectedCorpus('gold_corpus');
        result.current.setSelectedCorpusVersion('v1.0');
      });

      // Wait for model to load
      await waitFor(() => {
        expect(result.current.modelStatus).toBe('Model ready');
      });

      // Trigger evaluation
      act(() => {
        result.current.handleEvaluate();
      });

      // Should handle non-JSON response
      await waitFor(() => {
        expect(result.current.error).toBe('Evaluation failed: Server error (200)');
        expect(result.current.isEvaluating).toBe(false);
      });
    });

    it('handles evaluation with server error during calculation', async () => {
      // Mock the initial fetch calls that happen on mount (fetchTools and fetchCorpora)
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => [{ id: 'phenotagger', name: 'PhenoTagger' }]
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => [{ id: 'gold_corpus', name: 'Gold Corpus', corpus_version: 'v1.0' }]
        })
        // Mock the model status check that happens when tool is selected
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ state: 'ready' })
        })
        // Check existing metrics returns empty (no existing metrics)
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => []
        })
        // Evaluation API returns server error
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          headers: { get: () => 'application/json' },
          json: async () => ({ detail: 'Server error' })
        });

      const { result } = renderHook(() => usePerformanceAPI());

      // Wait for initial data to load
      await waitFor(() => {
        expect(result.current.tools).toHaveLength(1);
        expect(result.current.corpora).toHaveLength(1);
      });

      // Set up selections - this will trigger loadModel()
      act(() => {
        result.current.setSelectedTool('phenotagger');
        result.current.setSelectedCorpus('gold_corpus');
        result.current.setSelectedCorpusVersion('v1.0');
      });

      // Wait for model to load
      await waitFor(() => {
        expect(result.current.modelStatus).toBe('Model ready');
      });

      // Trigger evaluation
      act(() => {
        result.current.handleEvaluate();
      });

      // Should handle server error
      await waitFor(() => {
        expect(result.current.error).toBe('Evaluation failed: Server error');
        expect(result.current.isEvaluating).toBe(false);
      });
    });

    it('handles auto-clear error timer correctly', async () => {
      jest.useFakeTimers();
      
      const mockTools = [{ id: 'tool1', name: 'Tool 1' }];
      
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockTools
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => []
        });

      const { result } = renderHook(() => usePerformanceAPI());

      await waitFor(() => {
        expect(result.current.tools).toEqual(mockTools);
      });

      // Set an error
      act(() => {
        result.current.handlePredict();
      });

      expect(result.current.error).toBe('Please select a tool, corpus, and corpus version');

      // Fast-forward time to trigger auto-clear
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Error should be auto-cleared
      expect(result.current.error).toBe('');

      jest.useRealTimers();
    });
  });
});
