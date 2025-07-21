import './ModelOutput.css';
import React, { useState, useCallback, useEffect } from 'react';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';

function ModelOutput({ loading, result, originalText }) {
  // Parse result JSON
  let parsedResult = null;
  try {
    parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
  } catch (e) {}

  // Extract matches from all sentences
  const matches = (parsedResult?.results || []).flat();

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

  // Preload HPO details for all matches when matches change
  useEffect(() => {
    if (!matches || matches.length === 0) return;
    const uniqueIds = Array.from(new Set(matches.map(m => m.id)));
    uniqueIds.forEach(id => {
      fetchHpo(id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // Set lighter background and darker outline for each color
      let bgColor = '#fef3c7'; // light orange
      let outlineColor = '#f59e42'; // darker orange
      if (!fetching[id]) {
        if (isValid === true) {
          bgColor = '#d1fae5'; // light green
          outlineColor = '#059669'; // dark green
        } else {
          bgColor = '#fee2e2'; // light red
          outlineColor = '#dc2626'; // dark red
        }
      }
      return (
        <Tooltip
          key={i}
          title={
            fetching[id] ? (
              <CircularProgress size={20} />
            ) : isValid === true ? (
              <div>
                <div style={{ color: '#888', fontSize: 13, marginBottom: 2 }}>{details.id}</div>
                <div style={{ fontWeight: 'bold', color: '#111', fontSize: 18, marginBottom: 6 }}>{details.name}</div>
                <div style={{ color: '#888', fontSize: 13, marginBottom: 2 }}> {details.definition}</div>
                {details.synonyms && details.synonyms.length > 0 && (
                  <div style={{ color: '#888', fontSize: 13 }}>
                    <span style={{ color: '#444', fontWeight: 'bold', fontSize: 14 }}>Synonym:</span>
                    <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {details.synonyms.map((syn, idx) => (
                        <span key={idx} style={{ background: '#eee', color: '#555', borderRadius: 4, padding: '2px 6px', fontSize: 12, marginRight: 4, marginBottom: 2, display: 'inline-block' }}>{syn}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : isValid === false ? (
              <span style={{ color: '#f87171' }}>Invalid HPO ID</span>
            ) : (
              'Loading...'
            )
          }
          arrow
          placement="top"
          componentsProps={{
            tooltip: {
              style: {
                background: '#fff',
                color: '#222',
                border: '1px solid #ccc',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                borderRadius: 6,
                padding: 12,
              },
            },
          }}
        >
          <span
            style={{
              background: bgColor,
              border: `2px solid ${outlineColor}`,
              borderRadius: 4,
              padding: '0 2px',
              cursor: 'pointer',
              transition: 'background 0.2s, border 0.2s',
              boxSizing: 'border-box',
            }}
          >
            {match_text}
          </span>
        </Tooltip>
      );
    });
  }

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