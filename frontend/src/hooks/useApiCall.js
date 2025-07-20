import { useState } from 'react';

export function useApiCall() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const callApi = async (selectedTool, endpoint, method = 'GET', body = null) => {
    if (!selectedTool) {
      setError('No tool selected');
      return;
    }

    setLoading(true);
    setResult('');
    setError('');

    try {
      const response = await fetch(`/api/proxy/${selectedTool}${endpoint}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : null
      });
      
      // Check if response is successful
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error:', response.status, errorText);
        setError(`API error (${response.status}): ${response.statusText}`);
        setResult(`Error: API returned ${response.status} - ${response.statusText}`);
        return;
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        setResult(JSON.stringify(data, null, 2));
        setError(''); // Clear any previous errors
      } else {
        const errorText = await response.text();
        console.error('Non-JSON response:', errorText);
        setError(`Server returned non-JSON response (${response.status}). This usually means the model service is not running or there's a server error.`);
        setResult(`Error: Server returned non-JSON response (${response.status})`);
      }
    } catch (err) {
      const errorMessage = `API call failed: ${err.message}. Please check if the model service is running.`;
      setError(errorMessage);
      setResult(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearResult = () => {
    setResult('');
    setError('');
  };

  return {
    loading,
    result,
    error,
    callApi,
    clearResult
  };
} 