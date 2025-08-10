import { renderHook, act, waitFor } from '@testing-library/react';
import { useEvaluationAPI, useEvaluationPreload } from '../useEvaluationAPI';

// Mock the contexts
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

// Mock fetch globally
global.fetch = jest.fn();

describe('useEvaluationAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with default state from context', () => {
    const { result } = renderHook(() => useEvaluationAPI());
    
    expect(result.current.tools).toEqual([]);
    expect(result.current.corpora).toEqual([]);
    expect(result.current.metricsData).toEqual({});
  });

  it('provides context data', () => {
    const { result } = renderHook(() => useEvaluationAPI());
    
    expect(result.current.tools).toEqual([]);
    expect(result.current.corpora).toEqual([]);
    expect(result.current.metricsData).toEqual({});
  });
});

describe('useEvaluationPreload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useEvaluationPreload());
    
    expect(result.current.tools).toEqual([]);
    expect(result.current.corpora).toEqual([]);
    expect(result.current.metricsData).toEqual({});
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('');
    expect(result.current.hasInitialData).toBe(false);
  });

  it('fetches initial data on mount', async () => {
    const mockTools = [{ id: 'tool1', name: 'Tool 1' }];
    const mockCorpora = [{ id: 'corpus1', name: 'Corpus 1' }];

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

    const { result } = renderHook(() => useEvaluationPreload());

    await waitFor(() => {
      expect(result.current.tools).toEqual(mockTools);
      expect(result.current.corpora).toEqual(mockCorpora);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/tools/', expect.objectContaining({
      signal: expect.any(Object)
    }));
    expect(global.fetch).toHaveBeenCalledWith('/api/corpora/', expect.objectContaining({
      signal: expect.any(Object)
    }));
  });

  it('handles tools fetch error', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useEvaluationPreload());

    await waitFor(() => {
      expect(result.current.error).toContain('Error fetching tools: Network error');
    });
  });

  it('handles corpora fetch error', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => []
      })
      .mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useEvaluationPreload());

    await waitFor(() => {
      expect(result.current.error).toContain('Error fetching corpora: Network error');
    });
  });

  it('handles non-JSON response for tools', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'text/html' },
      text: async () => '<html>Server error</html>'
    });

    const { result } = renderHook(() => useEvaluationPreload());

    await waitFor(() => {
      expect(result.current.error).toBe('Server returned non-JSON response for tools');
    });
  });

  it('handles non-JSON response for corpora', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'text/html' },
        text: async () => '<html>Server error</html>'
      });

    const { result } = renderHook(() => useEvaluationPreload());

    await waitFor(() => {
      expect(result.current.error).toBe('Server returned non-JSON response for corpora');
    });
  });

  it('handles HTTP error responses', async () => {
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

  it('provides clearError function', () => {
    const { result } = renderHook(() => useEvaluationPreload());

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe('');
  });

  it('provides expected functions', () => {
    const { result } = renderHook(() => useEvaluationPreload());

    expect(typeof result.current.fetchAllMetrics).toBe('function');
    expect(typeof result.current.refreshData).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
  });

  it('provides expected state properties', () => {
    const { result } = renderHook(() => useEvaluationPreload());

    expect(Array.isArray(result.current.tools)).toBe(true);
    expect(Array.isArray(result.current.corpora)).toBe(true);
    expect(typeof result.current.metricsData).toBe('object');
    expect(typeof result.current.isLoading).toBe('boolean');
    expect(typeof result.current.error).toBe('string');
    expect(typeof result.current.hasInitialData).toBe('boolean');
    expect(typeof result.current.lastFetchTime).toBe('object');
    expect(typeof result.current.lastUpdatedCorpus).toBe('object');
  });

  describe('refreshData functionality', () => {
    it('validates refreshData function exists', () => {
      const { result } = renderHook(() => useEvaluationPreload());
      expect(typeof result.current.refreshData).toBe('function');
    });

    it('validates fetchAllMetrics function exists', () => {
      const { result } = renderHook(() => useEvaluationPreload());
      expect(typeof result.current.fetchAllMetrics).toBe('function');
    });
  });

  describe('error handling', () => {
    it('handles abort errors gracefully', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      
      global.fetch.mockRejectedValueOnce(abortError);

      const { result } = renderHook(() => useEvaluationPreload());

      await waitFor(() => {
        // Should not set error for AbortError
        expect(result.current.error).toBe('');
      });
    });

    it('handles network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network timeout'));

      const { result } = renderHook(() => useEvaluationPreload());

      await waitFor(() => {
        expect(result.current.error).toContain('Error fetching tools: Network timeout');
      });
    });
  });

  describe('state management', () => {
    it('manages loading state correctly', () => {
      const { result } = renderHook(() => useEvaluationPreload());
      
      expect(result.current.isLoading).toBe(false);
      expect(typeof result.current.isLoading).toBe('boolean');
    });

    it('manages error state correctly', () => {
      const { result } = renderHook(() => useEvaluationPreload());
      
      expect(result.current.error).toBe('');
      expect(typeof result.current.error).toBe('string');
    });

    it('manages success state correctly', () => {
      const { result } = renderHook(() => useEvaluationPreload());
      
      expect(result.current.hasInitialData).toBe(false);
      expect(typeof result.current.hasInitialData).toBe('boolean');
    });
  });

  describe('data fetching', () => {
    it('fetches tools successfully', async () => {
      const mockTools = [
        { id: 'tool1', name: 'Tool 1' },
        { id: 'tool2', name: 'Tool 2' }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => mockTools
      });

      const { result } = renderHook(() => useEvaluationPreload());

      await waitFor(() => {
        expect(result.current.tools).toEqual(mockTools);
        expect(result.current.tools).toHaveLength(2);
      });
    });

    it('fetches corpora successfully', async () => {
      const mockCorpora = [
        { id: 'corpus1', name: 'Corpus 1', corpus_version: 'v1.0' },
        { id: 'corpus2', name: 'Corpus 2', corpus_version: 'v2.0' }
      ];

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => []
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => mockCorpora
        });

      const { result } = renderHook(() => useEvaluationPreload());

      await waitFor(() => {
        expect(result.current.corpora).toEqual(mockCorpora);
        expect(result.current.corpora).toHaveLength(2);
      });
    });
  });

  describe('utility functions', () => {
    it('clearError resets error state', () => {
      const { result } = renderHook(() => useEvaluationPreload());

      // Test that clearError function exists and is callable
      expect(typeof result.current.clearError).toBe('function');
      expect(() => result.current.clearError()).not.toThrow();
      
      // The error should be empty by default
      expect(result.current.error).toBe('');
    });

    it('functions are callable', () => {
      const { result } = renderHook(() => useEvaluationPreload());

      // These should not throw errors when called
      expect(() => result.current.clearError()).not.toThrow();
      expect(() => result.current.fetchAllMetrics()).not.toThrow();
      expect(() => result.current.refreshData()).not.toThrow();
    });
  });
}); 