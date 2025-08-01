import { useState, useEffect, useRef } from 'react';
import { useEvaluationContext } from '../contexts/EvaluationContext';
import { useLoading } from '../contexts/LoadingContext';

// Hook for preloading evaluation data in App.jsx
export function useEvaluationPreload() {
  const [tools, setTools] = useState([]);
  const [corpora, setCorpora] = useState([]);
  const [metricsData, setMetricsData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [hasInitialData, setHasInitialData] = useState(false);
  const [lastUpdatedCorpus, setLastUpdatedCorpus] = useState(null);
  
  const { startLoading, stopLoading } = useLoading();
  
  // AbortController refs for cancellation
  const toolsAbortController = useRef(null);
  const corporaAbortController = useRef(null);
  const metricsAbortController = useRef(null);

  // Auto-clear errors after 10 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Cleanup abort controllers on unmount
  useEffect(() => {
    return () => {
      if (toolsAbortController.current) {
        toolsAbortController.current.abort();
      }
      if (corporaAbortController.current) {
        corporaAbortController.current.abort();
      }
      if (metricsAbortController.current) {
        metricsAbortController.current.abort();
      }
    };
  }, []);

  // Fetch available tools and corpora on component mount
  useEffect(() => {
    fetchTools();
    fetchCorpora();
  }, []);

  // Only fetch metrics once when we have tools and corpora and haven't fetched before
  useEffect(() => {
    if (tools.length > 0 && corpora.length > 0 && !hasInitialData) {
      console.log('Initial data fetch with:', { toolsCount: tools.length, corporaCount: corpora.length });
      fetchAllMetrics();
    }
  }, [tools, corpora, hasInitialData]);

  const fetchTools = async () => {
    // Cancel any existing request
    if (toolsAbortController.current) {
      toolsAbortController.current.abort();
    }
    
    toolsAbortController.current = new AbortController();
    
    try {
      const response = await fetch('/api/tools/', {
        signal: toolsAbortController.current.signal
      });
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const toolsData = await response.json();
          setTools(toolsData);
        } else {
          console.error('Non-JSON tools response:', await response.text());
          setError('Server returned non-JSON response for tools');
        }
      } else {
        setError('Failed to fetch tools');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        setError('Error fetching tools: ' + error.message);
      }
    } finally {
      toolsAbortController.current = null;
    }
  };

  const fetchCorpora = async () => {
    // Cancel any existing request
    if (corporaAbortController.current) {
      corporaAbortController.current.abort();
    }
    
    corporaAbortController.current = new AbortController();
    
    try {
      const response = await fetch('/api/corpora/', {
        signal: corporaAbortController.current.signal
      });
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const corporaData = await response.json();
          setCorpora(corporaData);
        } else {
          console.error('Non-JSON corpora response:', await response.text());
          setError('Server returned non-JSON response for corpora');
        }
      } else {
        setError('Failed to fetch corpora');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        setError('Error fetching corpora: ' + error.message);
      }
    } finally {
      corporaAbortController.current = null;
    }
  };

  const fetchAllMetrics = async () => {
    // Cancel any existing request
    if (metricsAbortController.current) {
      metricsAbortController.current.abort();
    }
    
    metricsAbortController.current = new AbortController();
    setIsLoading(true);
    setError('');
    
    console.log('Starting fetchAllMetrics with:', { toolsCount: tools.length, corporaCount: corpora.length });
    
    try {
      const newMetricsData = {};
      
      // Create all the requests we need to make
      const requests = [];
      for (const tool of tools) {
        for (const corpus of corpora) {
          const key = `${tool.id}_${corpus.name}_${corpus.corpus_version}`;
          requests.push({
            key,
            tool,
            corpus,
            url: `/api/metrics/${tool.id}/${corpus.name}/${corpus.corpus_version}`
          });
        }
      }
      
      // Process requests in batches to avoid overwhelming the database
      const batchSize = 2;
      for (let i = 0; i < requests.length; i += batchSize) {
        // Check if request was cancelled
        if (metricsAbortController.current.signal.aborted) {
          console.log('Request was cancelled');
          return;
        }
        
        const batch = requests.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(requests.length / batchSize)}`);
        
        // Process batch concurrently
        const batchPromises = batch.map(async ({ key, tool, corpus, url }) => {
          try {
            const response = await fetch(url, {
              signal: metricsAbortController.current.signal
            });
            
            if (response.ok) {
              const contentType = response.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                const metrics = await response.json();
                console.log(`Got metrics for ${key}:`, metrics.length, 'results');
                // Get the latest metrics (most recent evaluation)
                if (metrics.length > 0) {
                  const latestMetric = metrics[metrics.length - 1];
                  if (latestMetric.evaluation_result) {
                    newMetricsData[key] = {
                      tool: tool.id,
                      corpus: corpus.name,
                      corpusVersion: corpus.corpus_version,
                      ...latestMetric.evaluation_result
                    };
                    console.log(`Added metrics data for ${key}`);
                  }
                }
              }
            } else {
              console.log(`Failed to fetch metrics for ${key}:`, response.status, response.statusText);
            }
          } catch (error) {
            if (error.name !== 'AbortError') {
              console.warn(`Failed to fetch metrics for ${tool.id} on ${corpus.name}:`, error);
            }
            // Continue with other combinations even if one fails
          }
        });
        
        // Wait for current batch to complete before starting next batch
        await Promise.all(batchPromises);
        
        // Small delay between batches to give database connections time to be released
        if (i + batchSize < requests.length) {
          await new Promise(resolve => setTimeout(resolve, 200)); // Increased delay
        }
      }
      
      // Only update state if request wasn't cancelled
      if (!metricsAbortController.current.signal.aborted) {
        console.log('Setting metrics data:', Object.keys(newMetricsData).length, 'entries');
        setMetricsData(newMetricsData);
        setLastFetchTime(Date.now());
        setHasInitialData(true);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error in fetchAllMetrics:', error);
        setError('Error fetching metrics: ' + error.message);
      }
    } finally {
      setIsLoading(false);
      metricsAbortController.current = null;
    }
  };

  const retryFetchAll = async () => {
    console.log('Starting retryFetchAll');
    // Clear any existing errors
    setError('');
    startLoading(); // Disable navigation during retry
    
    try {
      // If we don't have tools or corpora, fetch them first
      if (tools.length === 0) {
        console.log('No tools found, fetching tools...');
        await fetchTools();
      }
      if (corpora.length === 0) {
        console.log('No corpora found, fetching corpora...');
        await fetchCorpora();
      }
      
      console.log('About to fetch metrics with:', { toolsCount: tools.length, corporaCount: corpora.length });
      
      // Try to fetch metrics with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          await fetchAllMetrics();
          break; // Success, exit retry loop
        } catch (error) {
          retryCount++;
          console.log(`Fetch attempt ${retryCount} failed:`, error.message);
          
          if (retryCount >= maxRetries) {
            setError(`Failed to fetch data after ${maxRetries} attempts. Please try again later.`);
            break;
          }
          
          // Exponential backoff: wait longer between each retry
          const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
          console.log(`Waiting ${delay}ms before retry ${retryCount + 1}...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    } finally {
      stopLoading(); // Re-enable navigation after retry
    }
  };

  const refreshData = async (selectedCorpus = null, selectedCorpusVersion = null) => {
    console.log('Manual refresh requested for:', { selectedCorpus, selectedCorpusVersion });
    
    // Cancel any existing request
    if (metricsAbortController.current) {
      metricsAbortController.current.abort();
    }
    
    metricsAbortController.current = new AbortController();
    setIsLoading(true);
    setError('');
    startLoading(); // Disable navigation during refresh
    
    try {
      const newMetricsData = {};
      
      // If no specific corpus/version provided, use the first available one
      const targetCorpus = selectedCorpus || (corpora.length > 0 ? corpora[0].name : null);
      const targetVersion = selectedCorpusVersion || (corpora.length > 0 ? corpora[0].corpus_version : null);
      
      if (!targetCorpus || !targetVersion) {
        setError('No corpus or version available for refresh');
        setIsLoading(false);
        return;
      }
      
      console.log(`Refreshing metrics for corpus: ${targetCorpus}, version: ${targetVersion}`);
      
      // Only fetch metrics for the selected corpus and version
      const requests = [];
      for (const tool of tools) {
        const key = `${tool.id}_${targetCorpus}_${targetVersion}`;
        requests.push({
          key,
          tool,
          corpus: { name: targetCorpus, corpus_version: targetVersion },
          url: `/api/metrics/${tool.id}/${targetCorpus}/${targetVersion}`
        });
      }
      
      console.log(`Making ${requests.length} requests for ${targetCorpus} (${targetVersion})`);
      
      // Process requests one at a time with conservative timing
      for (let i = 0; i < requests.length; i++) {
        // Check if request was cancelled
        if (metricsAbortController.current.signal.aborted) {
          console.log('Refresh request was cancelled');
          return;
        }
        
        const { key, tool, corpus, url } = requests[i];
        console.log(`Processing request ${i + 1}/${requests.length}: ${key}`);
        
        try {
          // Add a small delay before each request
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
          const response = await fetch(url, {
            signal: metricsAbortController.current.signal,
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          
          if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const metrics = await response.json();
              console.log(`Got metrics for ${key}:`, metrics.length, 'results');
              // Get the latest metrics (most recent evaluation)
              if (metrics.length > 0) {
                const latestMetric = metrics[metrics.length - 1];
                if (latestMetric.evaluation_result) {
                  newMetricsData[key] = {
                    tool: tool.id,
                    corpus: corpus.name,
                    corpusVersion: corpus.corpus_version,
                    ...latestMetric.evaluation_result
                  };
                  console.log(`Added metrics data for ${key}`);
                }
              }
            }
          } else {
            console.log(`Failed to fetch metrics for ${key}:`, response.status, response.statusText);
          }
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.warn(`Failed to fetch metrics for ${tool.id} on ${corpus.name}:`, error);
            // If we get a timeout error, wait longer before continuing
            if (error.message.includes('timeout') || error.message.includes('QueuePool')) {
              console.log('Detected timeout error, waiting 1 second before continuing...');
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
          // Continue with other tools even if one fails
        }
      }
      
      // Only update state if request wasn't cancelled
      if (!metricsAbortController.current.signal.aborted) {
        console.log('Setting refreshed metrics data:', Object.keys(newMetricsData).length, 'entries');
        // Merge new data with existing data instead of replacing it
        setMetricsData(prevData => ({
          ...prevData,
          ...newMetricsData
        }));
        setLastFetchTime(Date.now());
        setHasInitialData(true);
        // Truncate version to first 8 characters for display
        const shortVersion = targetVersion.length > 8 ? targetVersion.substring(0, 8) + '...' : targetVersion;
        setLastUpdatedCorpus(`${targetCorpus} (${shortVersion})`);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error in refreshData:', error);
        setError('Error refreshing data: ' + error.message);
      }
    } finally {
      setIsLoading(false);
      metricsAbortController.current = null;
      stopLoading(); // Re-enable navigation after refresh
    }
  };

  const clearError = () => setError('');

  return {
    // State
    tools,
    corpora,
    metricsData,
    isLoading,
    error,
    lastFetchTime,
    hasInitialData,
    lastUpdatedCorpus,
    
    // Actions
    fetchAllMetrics,
    refreshData,
    clearError,
  };
}

// Hook for EvaluationPage that uses preloaded data
export function useEvaluationAPI() {
  return useEvaluationContext();
}