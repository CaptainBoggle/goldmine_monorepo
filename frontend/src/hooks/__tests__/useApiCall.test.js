import { renderHook, act, waitFor } from '@testing-library/react';
import { useApiCall } from '../useApiCall';

// Mock the LoadingContext
jest.mock('../../contexts/LoadingContext', () => ({
  useLoading: () => ({
    startLoading: jest.fn(),
    stopLoading: jest.fn()
  })
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('useApiCall', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useApiCall());
    
    expect(result.current.loading).toBe(false);
    expect(result.current.result).toBe('');
    expect(result.current.error).toBe('');
  });

  it('loads saved result from localStorage on mount', () => {
    const savedResult = '{"test": "data"}';
    localStorage.setItem('inference_result', savedResult);

    const { result } = renderHook(() => useApiCall());
    
    expect(result.current.result).toBe(savedResult);
  });

  it('makes successful API call', async () => {
    const mockResponse = { success: true, data: 'test data' };
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'application/json'
      },
      json: async () => mockResponse
    });

    const { result } = renderHook(() => useApiCall());

    act(() => {
      result.current.callApi('test-tool', '/status', 'GET');
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.result).toBe(JSON.stringify(mockResponse, null, 2));
    expect(result.current.error).toBe('');
    expect(global.fetch).toHaveBeenCalledWith('/api/proxy/test-tool/status', {
      method: 'GET',
      headers: {},
      body: null
    });
  });

  it('handles API error response', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Server error'
    });

    const { result } = renderHook(() => useApiCall());

    act(() => {
      result.current.callApi('test-tool', '/status', 'GET');
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toContain('API error (500)');
    expect(result.current.result).toContain('Error: API returned 500');
  });

  it('handles non-JSON response', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'text/html'
      },
      text: async () => '<html>Server error</html>'
    });

    const { result } = renderHook(() => useApiCall());

    act(() => {
      result.current.callApi('test-tool', '/status', 'GET');
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toContain('Server returned non-JSON response');
    expect(result.current.result).toContain('Error: Server returned non-JSON response');
  });

  it('handles network error', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useApiCall());

    act(() => {
      result.current.callApi('test-tool', '/status', 'GET');
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toContain('API call failed: Network error');
    expect(result.current.result).toContain('Error: Network error');
  });

  it('handles missing tool selection', async () => {
    const { result } = renderHook(() => useApiCall());

    act(() => {
      result.current.callApi('', '/status', 'GET');
    });

    expect(result.current.error).toBe('No tool selected');
    expect(result.current.loading).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('makes POST request with body', async () => {
    const mockResponse = { success: true };
    const requestBody = { test: 'data' };
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'application/json'
      },
      json: async () => mockResponse
    });

    const { result } = renderHook(() => useApiCall());

    act(() => {
      result.current.callApi('test-tool', '/predict', 'POST', requestBody);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/proxy/test-tool/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
  });

  it('saves result to localStorage on successful call', async () => {
    const mockResponse = { success: true, data: 'test data' };
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'application/json'
      },
      json: async () => mockResponse
    });

    const { result } = renderHook(() => useApiCall());

    act(() => {
      result.current.callApi('test-tool', '/status', 'GET');
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(localStorage.getItem('inference_result')).toBe(JSON.stringify(mockResponse, null, 2));
  });

  it('clears result and error', async () => {
    const mockResponse = { success: true, data: 'test data' };
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => mockResponse
    });

    const { result } = renderHook(() => useApiCall());

    // First make an API call to set some state
    act(() => {
      result.current.callApi('test-tool', '/status', 'GET');
    });

    await waitFor(() => {
      expect(result.current.result).toBe(JSON.stringify(mockResponse, null, 2));
    });

    // Now clear the result
    act(() => {
      result.current.clearResult();
    });

    expect(result.current.result).toBe('');
    expect(result.current.error).toBe('');
    expect(localStorage.getItem('inference_result')).toBeNull();
  });

  it('clears localStorage when clearing result', () => {
    localStorage.setItem('inference_result', 'test data');
    
    const { result } = renderHook(() => useApiCall());

    act(() => {
      result.current.clearResult();
    });

    expect(localStorage.getItem('inference_result')).toBeNull();
  });

  it('handles multiple API calls', async () => {
    const mockResponse1 = { success: true, data: 'first call' };
    const mockResponse2 = { success: true, data: 'second call' };
    
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => mockResponse1
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => mockResponse2
      });

    const { result } = renderHook(() => useApiCall());

    // First call
    act(() => {
      result.current.callApi('test-tool', '/status', 'GET');
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.result).toBe(JSON.stringify(mockResponse1, null, 2));

    // Second call
    act(() => {
      result.current.callApi('test-tool', '/info', 'GET');
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.result).toBe(JSON.stringify(mockResponse2, null, 2));
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('resets state between calls', async () => {
    const mockResponse = { success: true };
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => mockResponse
    });

    const { result } = renderHook(() => useApiCall());

    // Set some error state first
    act(() => {
      result.current.error = 'previous error';
      result.current.result = 'previous result';
    });

    // Make API call
    act(() => {
      result.current.callApi('test-tool', '/status', 'GET');
    });

    // Should reset error and result at start of call
    expect(result.current.error).toBe('');
    expect(result.current.result).toBe('');

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
}); 