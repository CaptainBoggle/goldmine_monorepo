import './ModelOutput.css';
import React, { useState, useCallback } from 'react';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';

function ModelOutput({ loading, result, originalText }) {
  // Parse result JSON
  let parsedResult = null;
  try {
    parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
  } catch (e) {}

  // Extract matches
  const matches = parsedResult?.results?.[0] || [];

  // State for HPO details cache
  const [hpoDetails, setHpoDetails] = useState({});
  const [fetching, setFetching] = useState({});

  // Fetch HPO details on hover
  const fetchHpo = useCallback(async (id) => {
    if (hpoDetails[id] || fetching[id]) return;
    setFetching(f => ({ ...f, [id]: true }));
    try {
      const res = await fetch(`https://ontology.jax.org/api/hp/terms/${id}`);
      if (res.ok) {
        const data = await res.json();
        setHpoDetails(prev => ({ ...prev, [id]: { ...data, valid: true } }));
      } else {
        setHpoDetails(prev => ({ ...prev, [id]: { valid: false } }));
      }
    } catch {
      setHpoDetails(prev => ({ ...prev, [id]: { valid: false } }));
    } finally {
      setFetching(f => ({ ...f, [id]: false }));
    }
  }, [hpoDetails, fetching]);

  

  let content;
  if (loading) {
    content = <div className="model-output-loading">loading...</div>;
  } else if (parsedResult && originalText && matches.length > 0) {
    const annotated = annotateText(originalText, matches);
    content = <div className="model-output-result" style={{ whiteSpace: 'pre-wrap' }}>{renderAnnotated(annotated)}</div>;
  } else if (result) {
    content = <pre className="model-output-result">{result}</pre>;
  } else {
    content = null;
  }

  return (
    <div className="model-output-container">
      <label className="model-output-label">Model Output:</label>
      {content}
    </div>
  );
}

export default ModelOutput; 