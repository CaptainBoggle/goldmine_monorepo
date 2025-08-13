/**
 * Utility functions for API operations
 */

/**
 * Fetch data from API with abort controller support
 * @param {string} url - API endpoint
 * @param {AbortController} abortController - Abort controller for cancellation
 * @returns {Promise<Object>} Response data or error
 */
export const fetchWithAbort = async (url, abortController) => {
  try {
    const response = await fetch(url, {
      signal: abortController.signal
    });
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return { data: await response.json(), success: true };
      } else {
        console.error('Non-JSON response:', await response.text());
        return { error: 'Server returned non-JSON response', success: false };
      }
    } else {
      return { error: `Failed to fetch: ${response.status}`, success: false };
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      return { error: `Error fetching data: ${error.message}`, success: false };
    }
    return { error: 'Request cancelled', success: false };
  }
};

/**
 * Create and manage abort controllers
 * @returns {Object} Object with create, cancel, and cleanup methods
 */
export const createAbortControllerManager = () => {
  const controllers = new Map();
  
  const create = (key) => {
    // Cancel existing controller if it exists
    if (controllers.has(key)) {
      controllers.get(key).abort();
    }
    
    const controller = new AbortController();
    controllers.set(key, controller);
    return controller;
  };
  
  const cancel = (key) => {
    if (controllers.has(key)) {
      controllers.get(key).abort();
      controllers.delete(key);
    }
  };
  
  const cleanup = () => {
    controllers.forEach(controller => controller.abort());
    controllers.clear();
  };
  
  return { create, cancel, cleanup };
};

/**
 * Auto-clear error after specified time
 * @param {Function} setError - Function to clear error
 * @param {number} timeout - Timeout in milliseconds (default: 10000)
 * @returns {Function} Function to clear the timeout
 */
export const createAutoClearError = (setError, timeout = 10000) => {
  const timer = setTimeout(() => {
    setError('');
  }, timeout);
  
  return () => clearTimeout(timer);
};

/**
 * Check if data should be fetched based on conditions
 * @param {Array} tools - Tools array
 * @param {Array} corpora - Corpora array
 * @param {boolean} hasInitialData - Whether initial data has been fetched
 * @returns {boolean} Whether data should be fetched
 */
export const shouldFetchData = (tools, corpora, hasInitialData) => {
  return tools.length > 0 && corpora.length > 0 && !hasInitialData;
};

/**
 * Format error message for display
 * @param {string} context - Context of the error (e.g., 'tools', 'corpora')
 * @param {string} error - Error message
 * @returns {string} Formatted error message
 */
export const formatErrorMessage = (context, error) => {
  return `${context.charAt(0).toUpperCase() + context.slice(1)} Error: ${error}`;
};
