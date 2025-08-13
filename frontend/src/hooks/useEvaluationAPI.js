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
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  
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
  
  const refreshData = async (selectedCorpus = null, selectedCorpusVersion = null) => {
    console.log('Manual refresh requested for:', { selectedCorpus, selectedCorpusVersion });
    
    // Debounce: prevent rapid successive clicks
    const now = Date.now();
    if (lastRefreshTime && (now - lastRefreshTime) < 2000) {
      console.log('Refresh debounced - too soon since last refresh');
      return;
    }
    setLastRefreshTime(now);
    
    // Cancel any existing request and ensure cleanup
    if (metricsAbortController.current) {
      console.log('Cancelling existing request...');
      metricsAbortController.current.abort();
      metricsAbortController.current = null;
    }
    
    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
    
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
        stopLoading();
        return;
      }
      
      console.log(`Refreshing metrics for corpus: ${targetCorpus}, version: ${targetVersion}`);
      
      // First, check which tools have predictions for this corpus
      const toolsWithPredictions = [];
      for (const tool of tools) {
        try {
          console.log(`Checking predictions for tool: ${tool.id}...`);
          const predictionUrl = `/api/predictions/${tool.id}/${targetCorpus}/${targetVersion}`;
          const response = await fetch(predictionUrl, {
            signal: metricsAbortController.current.signal,
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          
          if (response.ok) {
            const predictions = await response.json();
            if (predictions && predictions.length > 0) {
              toolsWithPredictions.push(tool);
              console.log(`Found predictions for tool: ${tool.id}`);
            } else {
              console.log(`No predictions found for tool: ${tool.id}`);
            }
          } else {
            console.log(`Failed to check predictions for ${tool.id}: ${response.status}`);
          }
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.warn(`Failed to check predictions for ${tool.id}:`, error);
          }
        }
        
        // Small delay between prediction checks
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`Found ${toolsWithPredictions.length} tools with predictions for ${targetCorpus} (${targetVersion})`);
      
      if (toolsWithPredictions.length === 0) {
        console.log('No tools with predictions found, clearing metrics data');
        setMetricsData({});
        setLastUpdatedCorpus(null);
        return;
      }
      
      // Only fetch metrics for tools that have predictions
      for (let i = 0; i < toolsWithPredictions.length; i++) {
        // Check if request was cancelled
        if (metricsAbortController.current.signal.aborted) {
          console.log('Refresh request was cancelled');
          return;
        }
        
        const tool = toolsWithPredictions[i];
        const key = `${tool.id}_${targetCorpus}_${targetVersion}`;
        const url = `/api/metrics/${tool.id}/${targetCorpus}/${targetVersion}`;
        
        console.log(`Fetching metrics ${i + 1}/${toolsWithPredictions.length}: ${key}`);
        
        try {
          // Add a delay before each request (including the first one)
          if (i > 0) {
            console.log('Waiting 500ms before next request...');
            await new Promise(resolve => setTimeout(resolve, 500));
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
                    corpus: targetCorpus,
                    corpusVersion: targetVersion,
                    ...latestMetric.evaluation_result
                  };
                  console.log(`Added metrics data for ${key}`);
                }
              }
            }
          } else if (response.status === 500 || response.status === 503) {
            // Retry once for server errors
            console.log(`Server error for ${key}, retrying once...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const retryResponse = await fetch(url, {
              signal: metricsAbortController.current.signal,
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            });
            
            if (retryResponse.ok) {
              const contentType = retryResponse.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                const metrics = await retryResponse.json();
                console.log(`Got metrics for ${key} on retry:`, metrics.length, 'results');
                if (metrics.length > 0) {
                  const latestMetric = metrics[metrics.length - 1];
                  if (latestMetric.evaluation_result) {
                    newMetricsData[key] = {
                      tool: tool.id,
                      corpus: targetCorpus,
                      corpusVersion: targetVersion,
                      ...latestMetric.evaluation_result
                    };
                    console.log(`Added metrics data for ${key} on retry`);
                  }
                }
              }
            } else {
              console.log(`Failed to fetch metrics for ${key} on retry:`, retryResponse.status, retryResponse.statusText);
            }
          } else {
            console.log(`Failed to fetch metrics for ${key}:`, response.status, response.statusText);
          }
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.warn(`Failed to fetch metrics for ${tool.id} on ${targetCorpus}:`, error);
            // If we get a timeout error, wait longer before continuing
            if (error.message.includes('timeout') || error.message.includes('QueuePool')) {
              console.log('Detected timeout error, waiting 3 seconds before continuing...');
              await new Promise(resolve => setTimeout(resolve, 3000));
            }
          }
          // Continue with other tools even if one fails
        }
      }
      
      // Only update state if request wasn't cancelled
      if (!metricsAbortController.current.signal.aborted) {
        console.log('Updating metrics data with:', Object.keys(newMetricsData).length, 'entries');
        setMetricsData(prevData => ({
          ...prevData,
          ...newMetricsData
        }));
        
        // Update last updated corpus with truncated version
        const shortVersion = targetVersion.length > 8 ? targetVersion.substring(0, 8) + '...' : targetVersion;
        setLastUpdatedCorpus(`${targetCorpus} (${shortVersion})`);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error in refreshData:', error);
        setError('Error refreshing metrics: ' + error.message);
      }
    } finally {
      console.log('Refresh completed, cleaning up...');
      setIsLoading(false);
      stopLoading();
      if (metricsAbortController.current) {
        metricsAbortController.current.abort();
        metricsAbortController.current = null;
      }
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
  const context = useEvaluationContext();
  // Also expose fetchAllMetrics from the preload hook for manual fetching
  return {
    ...context,
    fetchAllMetrics: context.fetchAllMetrics
  };
}