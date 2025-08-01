import { useState, useEffect, useRef } from 'react';
import { useLoading } from '../contexts/LoadingContext';

export function usePerformanceAPI() {
  const [tools, setTools] = useState([]);
  const [corpora, setCorpora] = useState([]);
  const [selectedTool, setSelectedTool] = useState('');
  const [selectedCorpus, setSelectedCorpus] = useState('');
  const [selectedCorpusVersion, setSelectedCorpusVersion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [modelStatus, setModelStatus] = useState('');
  
  const { startLoading, stopLoading } = useLoading();

  // AbortController refs for cancellation
  const predictAbortController = useRef(null);
  const evaluateAbortController = useRef(null);

  // Auto-clear errors after 10 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Fetch available tools and corpora on component mount
  useEffect(() => {
    fetchTools();
    fetchCorpora();
  }, []);

  // Clear metrics when selections change
  useEffect(() => {
    setMetrics(null);
    setDataSource('');
    setSuccess('');
  }, [selectedCorpus, selectedCorpusVersion]);

  // Auto-load model when tool is selected
  useEffect(() => {
    if (selectedTool) {
      loadModel();
    } else {
      setModelStatus('');
    }
  }, [selectedTool]);

  // Cleanup abort controllers on unmount
  useEffect(() => {
    return () => {
      if (predictAbortController.current) {
        predictAbortController.current.abort();
      }
      if (evaluateAbortController.current) {
        evaluateAbortController.current.abort();
      }
    };
  }, []);

  const loadModel = async () => {
    if (!selectedTool) return;
    
    setModelStatus('Loading model...');
    setError('');
    
    try {
      // First check if model is already loaded
      const statusResponse = await fetch(`/api/proxy/${selectedTool}/status`);
      if (statusResponse.ok) {
        const contentType = statusResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const status = await statusResponse.json();
          if (status.state === 'ready') {
            setModelStatus('Model ready');
            return;
          }
        } else {
          console.error('Non-JSON status response:', await statusResponse.text());
          setModelStatus('Model status check failed');
          return;
        }
      }
      
      // Load the model
      const loadResponse = await fetch(`/api/proxy/${selectedTool}/load`, {
        method: 'POST',
      });
      
      if (loadResponse.ok) {
        const contentType = loadResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const result = await loadResponse.json();
          setModelStatus(`Model loaded (${result.loading_time.toFixed(1)}s)`);
        } else {
          console.error('Non-JSON load response:', await loadResponse.text());
          setModelStatus('Model loading failed');
          setError('Server returned non-JSON response');
        }
      } else {
        const contentType = loadResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await loadResponse.json();
          setModelStatus('Model loading failed');
          setError(`Failed to load model: ${errorData.detail || 'Unknown error'}`);
        } else {
          const errorText = await loadResponse.text();
          console.error('Non-JSON error response:', errorText);
          setModelStatus('Model loading failed');
          setError(`Failed to load model: Server error (${loadResponse.status})`);
        }
      }
    } catch (error) {
      setModelStatus('Model loading failed');
      setError('Error loading model: ' + error.message);
    }
  };

  const fetchTools = async () => {
    try {
      const response = await fetch('/api/tools/');
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
      setError('Error fetching tools: ' + error.message);
    }
  };

  const fetchCorpora = async () => {
    try {
      const response = await fetch('/api/corpora/');
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
      setError('Error fetching corpora: ' + error.message);
    }
  };

  const checkExistingPredictions = async () => {
    try {
      const response = await fetch(
        `/api/predictions/${selectedTool}/${selectedCorpus}/${selectedCorpusVersion}`
      );
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const predictions = await response.json();
          console.log('GET predictions response:', predictions);
          return predictions.length > 0;
        } else {
          console.error('Non-JSON predictions response:', await response.text());
          return false;
        }
      } else {
        console.log('Error checking predictions:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error checking existing predictions:', error);
    }
    return false;
  };

  const handlePredict = async () => {
    if (!selectedTool || !selectedCorpus || !selectedCorpusVersion) {
      setError('Please select a tool, corpus, and corpus version');
      return;
    }

    setIsPredicting(true);
    setError('');
    setSuccess('');
    startLoading(); // Prevent navigation during prediction

    // Create new AbortController for this prediction
    predictAbortController.current = new AbortController();

    try {
      // Check if predictions already exist
      const predictionsExist = await checkExistingPredictions();
      
      if (predictionsExist) {
        setSuccess('Predictions already exist for this tool and corpus. Using existing data.');
        setDataSource('cached');
      } else {
        // Run new predictions
        const response = await fetch(
          `/api/predictions/${selectedTool}/${selectedCorpus}/${selectedCorpusVersion}/predict`,
          {
            method: 'POST',
            signal: predictAbortController.current.signal,
          }
        );

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const result = await response.json();
            setSuccess(`Prediction completed successfully! ${result.message}`);
            setDataSource('new');
          } else {
            const errorText = await response.text();
            console.error('Non-JSON response:', errorText);
            setError(`Prediction failed: Server error (${response.status})`);
          }
        } else {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            setError(`Prediction failed: ${errorData.detail || 'Unknown error'}`);
          } else {
            const errorText = await response.text();
            console.error('Non-JSON response:', errorText);
            setError(`Prediction failed: Server error (${response.status})`);
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        setError('Prediction was cancelled by user');
      } else {
        console.error('Prediction error:', error);
        setError('Error running prediction: ' + error.message);
      }
    } finally {
      setIsPredicting(false);
      predictAbortController.current = null;
      stopLoading();
    }
  };

  const handleCancelPredict = () => {
    if (predictAbortController.current) {
      predictAbortController.current.abort();
    }
  };

  const checkExistingMetrics = async () => {
    try {
      const response = await fetch(
        `/api/metrics/${selectedTool}/${selectedCorpus}/${selectedCorpusVersion}`
      );
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const metrics = await response.json();
          console.log('GET metrics response:', metrics);
          return metrics.length > 0 ? metrics[metrics.length - 1] : null;
        } else {
          console.error('Non-JSON metrics response:', await response.text());
          return null;
        }
      }
    } catch (error) {
      console.log('Error checking existing metrics:', error);
    }
    return null;
  };

  const handleEvaluate = async () => {
    if (!selectedTool || !selectedCorpus || !selectedCorpusVersion) {
      setError('Please select a tool, corpus, and corpus version');
      return;
    }

    setIsEvaluating(true);
    setError('');
    setSuccess('');
    startLoading(); // Prevent navigation during evaluation

    // Create new AbortController for this evaluation
    evaluateAbortController.current = new AbortController();

    try {
      // Check if metrics already exist
      const existingMetrics = await checkExistingMetrics();
      
      if (existingMetrics) {
        console.log('Found existing metrics:', existingMetrics);
        console.log('Evaluation result:', existingMetrics.evaluation_result);
        
        const metricsData = existingMetrics.evaluation_result;
        console.log('Setting metrics data:', metricsData);
        
        if (metricsData && typeof metricsData === 'object' && 
            (metricsData.accuracy !== undefined || metricsData.f1 !== undefined || 
             metricsData.precision !== undefined || metricsData.recall !== undefined)) {
          setMetrics(metricsData);
          setSuccess('Using existing evaluation metrics.');
          setDataSource('cached');
        } else {
          console.log('Invalid metrics data structure:', metricsData);
          setError('Invalid metrics data structure - missing required fields');
        }
        setIsEvaluating(false);
        stopLoading();
        return;
      } else {
        // Calculate new metrics
        const response = await fetch(
          `/api/metrics/${selectedTool}/${selectedCorpus}/${selectedCorpusVersion}`,
          {
            method: 'POST',
            signal: evaluateAbortController.current.signal,
          }
        );

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const metricsData = await response.json();
            setMetrics(metricsData);
            setSuccess('Evaluation completed successfully!');
            setDataSource('new');
          } else {
            const errorText = await response.text();
            console.error('Non-JSON response:', errorText);
            setError(`Evaluation failed: Server error (${response.status})`);
          }
        } else {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            setError(`Evaluation failed: ${errorData.detail || 'Unknown error'}`);
          } else {
            const errorText = await response.text();
            console.error('Non-JSON response:', errorText);
            setError(`Evaluation failed: Server error (${response.status})`);
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        setError('Evaluation was cancelled by user');
      } else {
        setError('Error running evaluation: ' + error.message);
      }
    } finally {
      setIsEvaluating(false);
      evaluateAbortController.current = null;
      stopLoading();
    }
  };

  const handleCancelEvaluate = () => {
    if (evaluateAbortController.current) {
      evaluateAbortController.current.abort();
    }
  };

  const clearError = () => setError('');
  const clearSuccess = () => setSuccess('');

  return {
    // State
    tools,
    corpora,
    selectedTool,
    selectedCorpus,
    selectedCorpusVersion,
    isLoading,
    isPredicting,
    isEvaluating,
    metrics,
    error,
    success,
    dataSource,
    modelStatus,
    
    // Setters
    setSelectedTool,
    setSelectedCorpus,
    setSelectedCorpusVersion,
    
    // Actions
    loadModel,
    handlePredict,
    handleEvaluate,
    handleCancelPredict,
    handleCancelEvaluate,
    clearError,
    clearSuccess,
  };
} 