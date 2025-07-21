import { useState, useEffect } from 'react';

export function useTools() {
  const [tools, setTools] = useState([]);
  const [selectedTool, setSelectedTool] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      const response = await fetch('/api/tools/');
      
      // Check if response is successful
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Tools API error:', response.status, errorText);
        setError(`Tools API error (${response.status}): ${response.statusText}`);
        return;
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        const toolsArray = Array.isArray(data) ? data : [];
        setTools(toolsArray);
        
        // Auto-select first tool if available
        if (toolsArray.length > 0 && !selectedTool) {
          setSelectedTool(toolsArray[0].id);
        }
        
        // Clear any previous errors
        setError('');
      } else {
        const errorText = await response.text();
        console.error('Non-JSON tools response:', errorText);
        setError(`Server returned non-JSON response for tools (${response.status}). This usually means the backend is not running or there's a server error.`);
      }
    } catch (err) {
      console.error('Error fetching tools:', err);
      setError(`Failed to fetch tools: ${err.message}. Please check if the backend server is running.`);
    }
  };

  return {
    tools,
    selectedTool,
    setSelectedTool,
    error,
    fetchTools
  };
} 