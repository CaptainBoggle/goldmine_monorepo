import './ModelOutput.css';
import './common-styles.css';
import React, { useState, useCallback, useEffect } from 'react';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import { parseResultAndMatches, fetchHpoDetails, getAnnotatedTextClass } from '../utils/hpoUtils';

function ModelOutput({ loading, result, originalText, hasRunAnalysis }) {
  // Parse result JSON and extract matches
  const { parsedResult, matches } = parseResultAndMatches(result);

  // State for HPO details cache
  const [hpoDetails, setHpoDetails] = useState({});
  const [fetching, setFetching] = useState({});

  // Fetch HPO details on hover
  const fetchHpo = useCallback(async (id) => {
    if (hpoDetails[id] || fetching[id]) return;
    setFetching(f => ({ ...f, [id]: true }));
    try {
      const details = await fetchHpoDetails(id);
      setHpoDetails(prev => ({ ...prev, [id]: details }));
    } finally {
      setFetching(f => ({ ...f, [id]: false }));
    }
  }, [hpoDetails, fetching]);

  // Preload HPO details for all matches when matches change
  useEffect(() => {
    if (!matches || matches.length === 0) return;
    const uniqueIds = Array.from(new Set(matches.map(m => m.id)));
    uniqueIds.forEach(id => {
      fetchHpo(id);
    });
  }, [JSON.stringify(matches)]);

  // Annotate text with spans for each match
  function annotateText(text, matches) {
    if (!text || !matches.length) return text;
    // Sort matches by length descending to avoid nested replacements
    const sorted = [...matches].sort((a, b) => b.match_text.length - a.match_text.length);
    let annotated = text;
    // To avoid replacing inside already-annotated spans, we tokenize
    let tokens = [annotated];
    sorted.forEach(({ match_text, id }) => {
      const nextTokens = [];
      tokens.forEach(token => {
        if (typeof token !== 'string') {
          nextTokens.push(token);
          return;
        }
        const parts = token.split(match_text);
        for (let i = 0; i < parts.length; i++) {
          if (parts[i]) nextTokens.push(parts[i]);
          if (i < parts.length - 1) {
            nextTokens.push({ match_text, id });
          }
        }
      });
      tokens = nextTokens;
    });
    return tokens;
  }

  // Render annotated text with tooltips
  function renderAnnotated(tokens) {
    return tokens.map((token, i) => {
      if (typeof token === 'string') return token;
      const { match_text, id } = token;
      const details = hpoDetails[id];
      const isValid = details?.valid;
      let color = '#facc15'; // orange while loading
      if (!fetching[id]) {
        color = isValid === true ? '#4ade80' : '#f87171';
      }
      // Determine CSS class based on validation state
      const annotatedClass = getAnnotatedTextClass(fetching[id], isValid);
      
      return (
        <Tooltip
          key={i}
          title={
            fetching[id] ? (
              <CircularProgress size={20} />
            ) : isValid === true ? (
              <div className="tooltip-content">
                <div className="text-secondary mb-1">{details.id}</div>
                <div className="font-bold" style={{ color: '#111', fontSize: 18, marginBottom: 6 }}>{details.name}</div>
                <div className="text-secondary mb-1"> {details.definition}</div>
                {details.synonyms && details.synonyms.length > 0 && (
                  <div className="text-secondary">
                    <span className="font-bold" style={{ color: '#444', fontSize: 14 }}>Synonym:</span>
                    <div className="flex-wrap flex-gap-4" style={{ marginTop: 4 }}>
                      {details.synonyms.map((syn, idx) => (
                        <span key={idx} className="hpo-synonym-tag">{syn}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : isValid === false ? (
              <span className="error-text">Invalid HPO ID</span>
            ) : (
              'Loading...'
            )
          }
          arrow
          placement="top"
        >
          <span className={annotatedClass}>
            {match_text}
          </span>
        </Tooltip>
      );
    });
  }

  let content;
  if (loading) {
    content = <div className="model-output-loading">loading...</div>;
  } else if (hasRunAnalysis && result && parsedResult && originalText && matches.length > 0) {
    // Show annotated text with hoverable terms
    const annotated = annotateText(originalText, matches);
    content = <div className="model-output-result pre-wrap">{renderAnnotated(annotated)}</div>;
  } else if (hasRunAnalysis && result && parsedResult && originalText && matches.length === 0 && parsedResult.results) {
    // Show original text if we have a valid prediction result but no matches
    content = <div className="model-output-result pre-wrap">{originalText}</div>;
  } else {
    // Don't show anything for non-prediction results (model actions) or when no analysis has been run
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