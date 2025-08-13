import { renderHook, act, waitFor } from '@testing-library/react';
import { useTools } from '../useTools';

// Mock fetch globally
global.fetch = jest.fn();

describe('useTools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useTools());
    
    expect(result.current.tools).toEqual([]);
    expect(result.current.selectedTool).toBe('');
    expect(result.current.error).toBe('');
  });

  it('fetches tools successfully', async () => {
    const mockTools = [
      { id: 'tool1', name: 'Tool 1' },
      { id: 'tool2', name: 'Tool 2' }
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'application/json'
      },
      json: async () => mockTools
    });

    const { result } = renderHook(() => useTools());

    await waitFor(() => {
      expect(result.current.tools).toEqual(mockTools);
    });

    expect(result.current.error).toBe('');
    expect(global.fetch).toHaveBeenCalledWith('/api/tools/');
  });

  it('auto-selects first tool when tools are fetched', async () => {
    const mockTools = [
      { id: 'tool1', name: 'Tool 1' },
      { id: 'tool2', name: 'Tool 2' }
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'application/json'
      },
      json: async () => mockTools
    });

    const { result } = renderHook(() => useTools());

    await waitFor(() => {
      expect(result.current.selectedTool).toBe('tool1');
    });
  });

  it('handles API error response', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Server error'
    });

    const { result } = renderHook(() => useTools());

    await waitFor(() => {
      expect(result.current.error).toContain('Tools API error (500)');
    });

    expect(result.current.tools).toEqual([]);
  });

  it('handles non-JSON response', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'text/html'
      },
      text: async () => '<html>Server error</html>'
    });

    const { result } = renderHook(() => useTools());

    await waitFor(() => {
      expect(result.current.error).toContain('Server returned non-JSON response');
    });
  });

  it('handles network error', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useTools());

    await waitFor(() => {
      expect(result.current.error).toContain('Failed to fetch tools: Network error');
    });
  });

  it('allows manual tool selection', async () => {
    const mockTools = [
      { id: 'tool1', name: 'Tool 1' },
      { id: 'tool2', name: 'Tool 2' }
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'application/json'
      },
      json: async () => mockTools
    });

    const { result } = renderHook(() => useTools());

    await waitFor(() => {
      expect(result.current.tools).toEqual(mockTools);
    });

    act(() => {
      result.current.setSelectedTool('tool2');
    });

    expect(result.current.selectedTool).toBe('tool2');
  });

  it('handles empty tools array', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'application/json'
      },
      json: async () => []
    });

    const { result } = renderHook(() => useTools());

    await waitFor(() => {
      expect(result.current.tools).toEqual([]);
    });

    expect(result.current.selectedTool).toBe('');
    expect(result.current.error).toBe('');
  });

  it('handles non-array response', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'application/json'
      },
      json: async () => ({ message: 'Not an array' })
    });

    const { result } = renderHook(() => useTools());

    await waitFor(() => {
      expect(result.current.tools).toEqual([]);
    });
  });

  it('allows manual refresh of tools', async () => {
    const mockTools = [
      { id: 'tool1', name: 'Tool 1' }
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'application/json'
      },
      json: async () => mockTools
    });

    const { result } = renderHook(() => useTools());

    await waitFor(() => {
      expect(result.current.tools).toEqual(mockTools);
    });

    // Clear tools and error
    act(() => {
      result.current.setSelectedTool('');
    });

    // Mock second fetch
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'application/json'
      },
      json: async () => mockTools
    });

    // Manually fetch tools again
    act(() => {
      result.current.fetchTools();
    });

    await waitFor(() => {
      expect(result.current.tools).toEqual(mockTools);
    });
  });

  it('clears error when successful fetch occurs after error', async () => {
    // First fetch fails
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Server error'
    });

    const { result } = renderHook(() => useTools());

    await waitFor(() => {
      expect(result.current.error).toContain('Tools API error (500)');
    });

    // Second fetch succeeds
    const mockTools = [{ id: 'tool1', name: 'Tool 1' }];
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'application/json'
      },
      json: async () => mockTools
    });

    act(() => {
      result.current.fetchTools();
    });

    await waitFor(() => {
      expect(result.current.error).toBe('');
      expect(result.current.tools).toEqual(mockTools);
    });
  });
}); 