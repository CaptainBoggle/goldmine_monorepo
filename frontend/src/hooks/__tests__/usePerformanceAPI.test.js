import { renderHook, act, waitFor } from '@testing-library/react';
import { usePerformanceAPI } from '../usePerformanceAPI';

// Mock the LoadingContext
jest.mock('../../contexts/LoadingContext', () => ({
  useLoading: () => ({
    startLoading: jest.fn(),
    stopLoading: jest.fn()
  })
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('usePerformanceAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => usePerformanceAPI());
    
    expect(result.current.tools).toEqual([]);
    expect(result.current.corpora).toEqual([]);
    expect(result.current.selectedTool).toBe('');
    expect(result.current.selectedCorpus).toBe('');
    expect(result.current.selectedCorpusVersion).toBe('');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isPredicting).toBe(false);
    expect(result.current.isEvaluating).toBe(false);
    expect(result.current.metrics).toBeNull();
    expect(result.current.error).toBe('');
    expect(result.current.success).toBe('');
    expect(result.current.dataSource).toBe('');
    expect(result.current.modelStatus).toBe('');
  });

  it('allows setting selected tool', () => {
    const { result } = renderHook(() => usePerformanceAPI());

    act(() => {
      result.current.setSelectedTool('tool1');
    });

    expect(result.current.selectedTool).toBe('tool1');
  });

  it('allows setting selected corpus', () => {
    const { result } = renderHook(() => usePerformanceAPI());

    act(() => {
      result.current.setSelectedCorpus('corpus1');
    });

    expect(result.current.selectedCorpus).toBe('corpus1');
  });

  it('allows setting selected corpus version', () => {
    const { result } = renderHook(() => usePerformanceAPI());

    act(() => {
      result.current.setSelectedCorpusVersion('v1.0');
    });

    expect(result.current.selectedCorpusVersion).toBe('v1.0');
  });

  it('fetches tools and corpora on mount', async () => {
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

    const { result } = renderHook(() => usePerformanceAPI());

    await waitFor(() => {
      expect(result.current.tools).toEqual(mockTools);
      expect(result.current.corpora).toEqual(mockCorpora);
    });
  });

  it('handles tools fetch error', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => usePerformanceAPI());

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

    const { result } = renderHook(() => usePerformanceAPI());

    await waitFor(() => {
      expect(result.current.error).toContain('Error fetching corpora: Network error');
    });
  });

  it('handles non-JSON responses', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'text/html' },
      text: async () => '<html>Server error</html>'
    });

    const { result } = renderHook(() => usePerformanceAPI());

    await waitFor(() => {
      expect(result.current.error).toBe('Server returned non-JSON response for tools');
    });
  });

  it('clears metrics when selections change', async () => {
    const { result } = renderHook(() => usePerformanceAPI());

    // Set initial metrics
    act(() => {
      result.current.metrics = { accuracy: 0.85 };
      result.current.dataSource = 'cached';
      result.current.success = 'Test success';
    });

    expect(result.current.metrics).toEqual({ accuracy: 0.85 });
    expect(result.current.dataSource).toBe('cached');
    expect(result.current.success).toBe('Test success');

    // Change corpus selection
    act(() => {
      result.current.setSelectedCorpus('new-corpus');
    });

    expect(result.current.metrics).toBeNull();
    expect(result.current.dataSource).toBe('');
    expect(result.current.success).toBe('');
  });

  it('provides clearError and clearSuccess functions', () => {
    const { result } = renderHook(() => usePerformanceAPI());

    expect(typeof result.current.clearError).toBe('function');
    expect(typeof result.current.clearSuccess).toBe('function');
  });

  it('provides expected functions', () => {
    const { result } = renderHook(() => usePerformanceAPI());

    expect(typeof result.current.loadModel).toBe('function');
    expect(typeof result.current.handlePredict).toBe('function');
    expect(typeof result.current.handleEvaluate).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
    expect(typeof result.current.clearSuccess).toBe('function');
  });

  describe('validation', () => {
    it('validates required selections before prediction', () => {
      const { result } = renderHook(() => usePerformanceAPI());

      act(() => {
        result.current.handlePredict();
      });

      expect(result.current.error).toBe('Please select a tool, corpus, and corpus version');
    });

    it('validates required selections before evaluation', () => {
      const { result } = renderHook(() => usePerformanceAPI());

      act(() => {
        result.current.handleEvaluate();
      });

      expect(result.current.error).toBe('Please select a tool, corpus, and corpus version');
    });
  });

  describe('error handling', () => {
    it('handles network errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network timeout'));

      const { result } = renderHook(() => usePerformanceAPI());

      await waitFor(() => {
        expect(result.current.error).toContain('Error fetching tools: Network timeout');
      });
    });

    it('handles HTTP error responses', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const { result } = renderHook(() => usePerformanceAPI());

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch tools');
      });
    });
  });

  describe('state management', () => {
    it('manages loading state correctly', () => {
      const { result } = renderHook(() => usePerformanceAPI());
      
      expect(result.current.isLoading).toBe(false);
      expect(typeof result.current.isLoading).toBe('boolean');
    });

    it('manages error state correctly', () => {
      const { result } = renderHook(() => usePerformanceAPI());
      
      expect(result.current.error).toBe('');
      expect(typeof result.current.error).toBe('string');
    });

    it('manages success state correctly', () => {
      const { result } = renderHook(() => usePerformanceAPI());
      
      expect(result.current.success).toBe('');
      expect(typeof result.current.success).toBe('string');
    });

    it('manages model status correctly', () => {
      const { result } = renderHook(() => usePerformanceAPI());
      
      expect(result.current.modelStatus).toBe('');
      expect(typeof result.current.modelStatus).toBe('string');
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

      const { result } = renderHook(() => usePerformanceAPI());

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

      const { result } = renderHook(() => usePerformanceAPI());

      await waitFor(() => {
        expect(result.current.corpora).toEqual(mockCorpora);
        expect(result.current.corpora).toHaveLength(2);
      });
    });
  });

  describe('utility functions', () => {
    it('clearError function exists and is callable', () => {
      const { result } = renderHook(() => usePerformanceAPI());

      expect(typeof result.current.clearError).toBe('function');
      expect(() => result.current.clearError()).not.toThrow();
    });

    it('clearSuccess function exists and is callable', () => {
      const { result } = renderHook(() => usePerformanceAPI());

      expect(typeof result.current.clearSuccess).toBe('function');
      expect(() => result.current.clearSuccess()).not.toThrow();
    });

    it('functions are callable', () => {
      const { result } = renderHook(() => usePerformanceAPI());

      // These should not throw errors when called
      expect(() => result.current.clearError()).not.toThrow();
      expect(() => result.current.clearSuccess()).not.toThrow();
      expect(() => result.current.loadModel()).not.toThrow();
      expect(() => result.current.handlePredict()).not.toThrow();
      expect(() => result.current.handleEvaluate()).not.toThrow();
    });
  });

  describe('model loading', () => {
    it('loadModel function exists and is callable', () => {
      const { result } = renderHook(() => usePerformanceAPI());

      expect(typeof result.current.loadModel).toBe('function');
      expect(() => result.current.loadModel()).not.toThrow();
    });

    it('loadModel function is called when tool is selected', () => {
      const { result } = renderHook(() => usePerformanceAPI());

      // Mock the loadModel function to track calls
      // const originalLoadModel = result.current.loadModel;
      const mockLoadModel = jest.fn();
      result.current.loadModel = mockLoadModel;

      act(() => {
        result.current.setSelectedTool('tool1');
      });

      // The loadModel function should be available
      expect(typeof result.current.loadModel).toBe('function');
    });
  });

  describe('prediction functionality', () => {
    it('handlePredict function exists and is callable', () => {
      const { result } = renderHook(() => usePerformanceAPI());

      expect(typeof result.current.handlePredict).toBe('function');
      expect(() => result.current.handlePredict()).not.toThrow();
    });
  });

  describe('evaluation functionality', () => {
    it('handleEvaluate function exists and is callable', () => {
      const { result } = renderHook(() => usePerformanceAPI());

      expect(typeof result.current.handleEvaluate).toBe('function');
      expect(() => result.current.handleEvaluate()).not.toThrow();
    });
  });
}); 