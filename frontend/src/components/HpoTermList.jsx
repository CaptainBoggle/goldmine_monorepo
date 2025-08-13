import React, { useState, useCallback, useEffect } from 'react';
import './common-styles.css';
import { fetchHpoDetails, getUniqueMatches } from '../utils/hpoUtils';

function HpoTermList({ matches }) {
  // Remove duplicate HPO IDs
  const uniqueMatches = getUniqueMatches(matches);

  // State for HPO details cache
  const [hpoDetails, setHpoDetails] = useState({});
  const [fetching, setFetching] = useState({});
  const [openIdx, setOpenIdx] = useState(null);

  // Fetch HPO details
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
    if (!uniqueMatches || uniqueMatches.length === 0) return;
    const uniqueIds = Array.from(new Set(uniqueMatches.map(m => m.id)));
    uniqueIds.forEach(id => {
      fetchHpo(id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(uniqueMatches)]);

  return (
    <div className="flex-column flex-gap-12">
      {uniqueMatches.map((m, idx) => {
        const details = hpoDetails[m.id];
        const isValid = details?.valid;
        const expanded = openIdx === idx;
        return (
          <div
            key={`${m.id}-${idx}`}
            className="hpo-term"
          >
            {/* HPO term name as clickable, fallback to ID if not loaded */}
            <button
              className="hpo-term-button"
              onClick={() => setOpenIdx(expanded ? null : idx)}
              disabled={fetching[m.id]}
              aria-expanded={expanded}
            >
              {fetching[m.id]
                ? 'Loading...'
                : (
                  <>
                    {details?.name || m.id}
                    <span className="text-secondary ml-8" style={{ fontWeight: 'normal', fontSize: 15 }}>
                      {details?.id ? `(${details.id})` : `(${m.id})`}
                    </span>
                  </>
                )}
            </button>
            {/* Expand details below the button if expanded */}
            {expanded && (
              <div className="mt-1">
                {fetching[m.id] ? (
                  <div className="loading-text">Loading...</div>
                ) : isValid === true ? (
                  <>
                    <div className="text-secondary mb-1"> {details.definition}</div>
                    {details.synonyms && details.synonyms.length > 0 && (
                      <div className="text-secondary">
                        <span className="font-bold" style={{ color: '#444', fontSize: 14 }}>Synonym:</span>
                        <div className="flex-wrap flex-gap-4" style={{ marginTop: 4 }}>
                          {details.synonyms.map((syn, sidx) => (
                            <span key={sidx} className="hpo-synonym-tag">{syn}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : isValid === false ? (
                  <span className="error-text">Invalid HPO ID</span>
                ) : (
                  <div className="loading-text">Loading...</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default HpoTermList; 