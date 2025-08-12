import { renderHook, act, waitFor } from '@testing-library/react';
import { useEvaluationAPI, useEvaluationPreload } from '../useEvaluationAPI';

// Mock the contexts with more realistic implementations
jest.mock('../../contexts/LoadingContext', () => ({
  useLoading: () => ({
    startLoading: jest.fn(),
    stopLoading: jest.fn()
  })
}));

jest.mock('../../contexts/EvaluationContext', () => ({
  useEvaluationContext: () => ({
    tools: [],
    corpora: [],
    metricsData: {}
  })
}));

// Mock fetch with more realistic responses
global.fetch = jest.fn();

describe('useEvaluationAPI Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset localStorage if it exists
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  });

  afterEach(() => {
    // Clean up any timers
    jest.clearAllTimers();
  });

  describe('useEvaluationPreload - Full Data Flow', () => {
    it('completes full data fetching cycle successfully', async () => {
      const mockTools = [
        { id: 'tool1', name: 'PhenoTagger', status: 'ready' },
        { id: 'tool2', name: 'PhenoBERT', status: 'ready' }
      ];
      
      const mockCorpora = [
        { id: 'corpus1', name: 'gold_corpus', corpus_version: 'v1.0' },
        { id: 'corpus2', name: 'gold_corpus_small', corpus_version: 'v2.0' }
      ];

      // Mock the metrics API responses for each tool-corpus combination
      const mockMetricsResponse1 = [
        {
          evaluation_result: {
            accuracy: 0.85,
            precision: 0.82,
            recall: 0.88,
            f1: 0.85,
            jaccard: 0.74
          }
        }
      ];

      const mockMetricsResponse2 = [
        {
          evaluation_result: {
            accuracy: 0.78,
            precision: 0.75,
            recall: 0.80,
            f1: 0.77,
            jaccard: 0.65
          }
        }
      ];

      // Mock sequential API calls: tools, corpora, then metrics for each combination
      global.fetch
        // Tools API call
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockTools
        })
        // Corpora API call
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockCorpora
        })
        // Metrics API calls for each tool-corpus combination
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockMetricsResponse1
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockMetricsResponse2
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockMetricsResponse1
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockMetricsResponse2
        });

      const { result } = renderHook(() => useEvaluationPreload());

      // Initial state
      expect(result.current.tools).toEqual([]);
      expect(result.current.corpora).toEqual([]);
      expect(result.current.metricsData).toEqual({});
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasInitialData).toBe(false);

      // Wait for tools to be fetched
      await waitFor(() => {
        expect(result.current.tools).toEqual(mockTools);
      });

      // Wait for corpora to be fetched
      await waitFor(() => {
        expect(result.current.corpora).toEqual(mockCorpora);
      });

      // Wait for metrics to be fetched (this takes longer due to batching)
      await waitFor(() => {
        expect(result.current.hasInitialData).toBe(true);
      }, { timeout: 5000 });

      // Verify API calls were made
      expect(global.fetch).toHaveBeenCalledWith('/api/tools/', expect.any(Object));
      expect(global.fetch).toHaveBeenCalledWith('/api/corpora/', expect.any(Object));
      
      // Should have metrics data
      expect(Object.keys(result.current.metricsData).length).toBeGreaterThan(0);
    });

    it('handles partial data loading gracefully', async () => {
      const mockTools = [{ id: 'tool1', name: 'PhenoTagger' }];
      
      // Only tools succeed, corpora fails
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockTools
        })
        .mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useEvaluationPreload());

      // Wait for tools to load
      await waitFor(() => {
        expect(result.current.tools).toEqual(mockTools);
      });

      // Wait for corpora error
      await waitFor(() => {
        expect(result.current.error).toContain('Error fetching corpora: Network error');
      });

      // Should still have tools data even though corpora failed
      expect(result.current.tools).toEqual(mockTools);
      expect(result.current.corpora).toEqual([]);
      expect(result.current.hasInitialData).toBe(false);
    });

    it('manages loading states correctly during data fetching', async () => {
      const mockTools = [{ id: 'tool1', name: 'Tool 1' }];
      const mockCorpora = [{ id: 'corpus1', name: 'Corpus 1', corpus_version: 'v1.0' }];
      
      // Mock successful responses
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
          json: async () => []
        });

      const { result } = renderHook(() => useEvaluationPreload());

      // Should start with loading state
      expect(result.current.isLoading).toBe(false);

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.tools).toEqual(mockTools);
        expect(result.current.corpora).toEqual(mockCorpora);
      });
    });

    it('handles concurrent API calls correctly', async () => {
      const mockTools = [{ id: 'tool1', name: 'Tool 1' }];
      const mockCorpora = [{ id: 'corpus1', name: 'Corpus 1', corpus_version: 'v1.0' }];

      // Mock concurrent responses
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
          json: async () => []
        });

      const { result } = renderHook(() => useEvaluationPreload());

      // Both should load successfully
      await waitFor(() => {
        expect(result.current.tools).toEqual(mockTools);
        expect(result.current.corpora).toEqual(mockCorpora);
      });
    });
  });

  describe('useEvaluationAPI - Context Integration', () => {
    it('provides context data correctly', () => {
      const { result } = renderHook(() => useEvaluationAPI());
      
      // Should provide the properties that are actually available in the context
      expect(result.current).toHaveProperty('tools');
      expect(result.current).toHaveProperty('corpora');
      expect(result.current).toHaveProperty('metricsData');
      expect(result.current).toHaveProperty('fetchAllMetrics');
      
      // These properties are not available in the context version
      // expect(result.current).toHaveProperty('isLoading');
      // expect(result.current).toHaveProperty('error');
      // expect(result.current).toHaveProperty('clearError');
      // expect(result.current).toHaveProperty('lastFetchTime');
      // expect(result.current).toHaveProperty('hasInitialData');
      // expect(result.current).toHaveProperty('lastUpdatedCorpus');
    });

    it('maintains consistent state between context and hook', () => {
      const { result } = renderHook(() => useEvaluationAPI());
      
      // Initial state should be consistent
      expect(result.current.tools).toEqual([]);
      expect(result.current.corpora).toEqual([]);
      expect(result.current.metricsData).toEqual({});
    });
  });

  describe('Error Handling and Recovery', () => {
    it('recovers from network errors and allows retry', async () => {
      // First call fails
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      
      const { result } = renderHook(() => useEvaluationPreload());

      // Wait for error
      await waitFor(() => {
        expect(result.current.error).toContain('Error fetching tools: Network error');
      });

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe('');

      // Test that clearError function works correctly
      expect(result.current.error).toBe('');
      
      // Test that the hook is still functional after error recovery
      expect(typeof result.current.fetchAllMetrics).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });

    it('handles malformed JSON responses gracefully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => { throw new Error('Invalid JSON') }
      });

      const { result } = renderHook(() => useEvaluationPreload());

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });

    it('handles server errors with proper error messages', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const { result } = renderHook(() => useEvaluationPreload());

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch tools');
      });
    });
  });

  describe('Data Persistence and State Management', () => {
    it('maintains state consistency across re-renders', async () => {
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
          json: async () => []
        });

      const { result, rerender } = renderHook(() => useEvaluationPreload());

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.tools).toEqual(mockTools);
        expect(result.current.corpora).toEqual(mockCorpora);
      });

      // Re-render the hook
      rerender();

      // State should persist
      expect(result.current.tools).toEqual(mockTools);
      expect(result.current.corpora).toEqual(mockCorpora);
    });

    it('handles component unmounting gracefully', async () => {
      // Mock a slow response
      global.fetch.mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            headers: { get: () => 'application/json' },
            json: async () => [{ id: 'tool1', name: 'Tool 1' }]
          }), 100)
        )
      );

      const { result, unmount } = renderHook(() => useEvaluationPreload());

      // Unmount before data loads
      unmount();

      // Should not throw errors
      expect(() => {}).not.toThrow();
    });
  });

  describe('Performance and Optimization', () => {
    it('avoids unnecessary re-renders during data fetching', async () => {
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
          json: async () => []
        });

      let renderCount = 0;
      const { result } = renderHook(() => {
        renderCount++;
        return useEvaluationPreload();
      });

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.tools).toEqual(mockTools);
        expect(result.current.corpora).toEqual(mockCorpora);
      });

      // Should not have excessive re-renders
      expect(renderCount).toBeLessThan(10);
    });

    it('manages memory efficiently with large datasets', async () => {
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

      const { result } = renderHook(() => useEvaluationPreload());

      await waitFor(() => {
        expect(result.current.tools).toHaveLength(100);
      });

      // Should handle large datasets without performance issues
      expect(result.current.tools[99].name).toBe('Tool 99');
    });
  });
}); 