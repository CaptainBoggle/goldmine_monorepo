import { 
  fetchWithAbort, 
  createAbortControllerManager, 
  createAutoClearError, 
  shouldFetchData, 
  formatErrorMessage 
} from '../apiUtils';

// Mock fetch globally
global.fetch = jest.fn();

describe('apiUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('fetchWithAbort', () => {
    it('should return data and success true for successful JSON response', async () => {
      const mockData = { test: 'data' };
      const mockResponse = {
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue('application/json')
        },
        json: jest.fn().mockResolvedValue(mockData)
      };
      
      global.fetch.mockResolvedValue(mockResponse);
      
      const abortController = new AbortController();
      const result = await fetchWithAbort('https://api.test.com/data', abortController);
      
      expect(result).toEqual({ data: mockData, success: true });
      expect(global.fetch).toHaveBeenCalledWith('https://api.test.com/data', {
        signal: abortController.signal
      });
    });

    it('should return error for non-JSON response', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue('text/plain')
        },
        text: jest.fn().mockResolvedValue('plain text response')
      };
      
      global.fetch.mockResolvedValue(mockResponse);
      
      const abortController = new AbortController();
      const result = await fetchWithAbort('https://api.test.com/data', abortController);
      
      expect(result).toEqual({ 
        error: 'Server returned non-JSON response', 
        success: false 
      });
    });

    it('should return error for failed response', async () => {
      const mockResponse = {
        ok: false,
        status: 404
      };
      
      global.fetch.mockResolvedValue(mockResponse);
      
      const abortController = new AbortController();
      const result = await fetchWithAbort('https://api.test.com/data', abortController);
      
      expect(result).toEqual({ 
        error: 'Failed to fetch: 404', 
        success: false 
      });
    });

    it('should return error for network error', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));
      
      const abortController = new AbortController();
      const result = await fetchWithAbort('https://api.test.com/data', abortController);
      
      expect(result).toEqual({ 
        error: 'Error fetching data: Network error', 
        success: false 
      });
    });

    it('should return cancelled message for AbortError', async () => {
      const abortError = new Error('Request cancelled');
      abortError.name = 'AbortError';
      global.fetch.mockRejectedValue(abortError);
      
      const abortController = new AbortController();
      const result = await fetchWithAbort('https://api.test.com/data', abortController);
      
      expect(result).toEqual({ 
        error: 'Request cancelled', 
        success: false 
      });
    });
  });

  describe('createAbortControllerManager', () => {
    it('should create a new controller', () => {
      const manager = createAbortControllerManager();
      const controller = manager.create('test-key');
      
      expect(controller).toBeInstanceOf(AbortController);
    });

    it('should cancel existing controller when creating new one with same key', () => {
      const manager = createAbortControllerManager();
      const controller1 = manager.create('test-key');
      const abortSpy = jest.spyOn(controller1, 'abort');
      
      const controller2 = manager.create('test-key');
      
      expect(abortSpy).toHaveBeenCalled();
      expect(controller2).toBeInstanceOf(AbortController);
      expect(controller2).not.toBe(controller1);
    });

    it('should cancel specific controller by key', () => {
      const manager = createAbortControllerManager();
      const controller = manager.create('test-key');
      const abortSpy = jest.spyOn(controller, 'abort');
      
      manager.cancel('test-key');
      
      expect(abortSpy).toHaveBeenCalled();
    });

    it('should handle cancel for non-existent key', () => {
      const manager = createAbortControllerManager();
      
      expect(() => {
        manager.cancel('non-existent-key');
      }).not.toThrow();
    });

    it('should cleanup all controllers', () => {
      const manager = createAbortControllerManager();
      const controller1 = manager.create('key1');
      const controller2 = manager.create('key2');
      
      const abortSpy1 = jest.spyOn(controller1, 'abort');
      const abortSpy2 = jest.spyOn(controller2, 'abort');
      
      manager.cleanup();
      
      expect(abortSpy1).toHaveBeenCalled();
      expect(abortSpy2).toHaveBeenCalled();
    });
  });

  describe('createAutoClearError', () => {
    it('should clear error after default timeout', () => {
      const setError = jest.fn();
      const clearTimeout = createAutoClearError(setError);
      
      expect(setError).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(10000);
      
      expect(setError).toHaveBeenCalledWith('');
    });

    it('should clear error after custom timeout', () => {
      const setError = jest.fn();
      const clearTimeout = createAutoClearError(setError, 5000);
      
      jest.advanceTimersByTime(4000);
      expect(setError).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(1000);
      expect(setError).toHaveBeenCalledWith('');
    });

    it('should return function to clear timeout', () => {
      const setError = jest.fn();
      const clearTimeout = createAutoClearError(setError, 5000);
      
      clearTimeout();
      
      jest.advanceTimersByTime(5000);
      expect(setError).not.toHaveBeenCalled();
    });
  });

  describe('shouldFetchData', () => {
    it('should return true when all conditions are met', () => {
      const tools = [{ id: 1 }, { id: 2 }];
      const corpora = [{ id: 1 }, { id: 2 }];
      const hasInitialData = false;
      
      const result = shouldFetchData(tools, corpora, hasInitialData);
      
      expect(result).toBe(true);
    });

    it('should return false when tools array is empty', () => {
      const tools = [];
      const corpora = [{ id: 1 }];
      const hasInitialData = false;
      
      const result = shouldFetchData(tools, corpora, hasInitialData);
      
      expect(result).toBe(false);
    });

    it('should return false when corpora array is empty', () => {
      const tools = [{ id: 1 }];
      const corpora = [];
      const hasInitialData = false;
      
      const result = shouldFetchData(tools, corpora, hasInitialData);
      
      expect(result).toBe(false);
    });

    it('should return false when hasInitialData is true', () => {
      const tools = [{ id: 1 }];
      const corpora = [{ id: 1 }];
      const hasInitialData = true;
      
      const result = shouldFetchData(tools, corpora, hasInitialData);
      
      expect(result).toBe(false);
    });

    it('should return false when all conditions are not met', () => {
      const tools = [];
      const corpora = [];
      const hasInitialData = true;
      
      const result = shouldFetchData(tools, corpora, hasInitialData);
      
      expect(result).toBe(false);
    });
  });

  describe('formatErrorMessage', () => {
    it('should format error message with capitalized context', () => {
      const result = formatErrorMessage('tools', 'Failed to fetch');
      
      expect(result).toBe('Tools Error: Failed to fetch');
    });

    it('should handle single character context', () => {
      const result = formatErrorMessage('a', 'test error');
      
      expect(result).toBe('A Error: test error');
    });

    it('should handle empty context', () => {
      const result = formatErrorMessage('', 'test error');
      
      expect(result).toBe(' Error: test error');
    });

    it('should handle empty error message', () => {
      const result = formatErrorMessage('tools', '');
      
      expect(result).toBe('Tools Error: ');
    });
  });
});
