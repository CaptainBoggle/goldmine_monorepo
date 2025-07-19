import React, { useState, useCallback, useEffect } from 'react';

function HpoTermList({ matches }) {
  // Remove duplicate HPO IDs
  const uniqueMatches = Array.from(
    matches.reduce((map, m) => map.set(m.id, m), new Map()).values()
  );

  // State for HPO details cache
  const [hpoDetails, setHpoDetails] = useState({});
  const [fetching, setFetching] = useState({});
  const [openIdx, setOpenIdx] = useState(null);

  // Fetch HPO details
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
    if (!uniqueMatches || uniqueMatches.length === 0) return;
    const uniqueIds = Array.from(new Set(uniqueMatches.map(m => m.id)));
    uniqueIds.forEach(id => {
      fetchHpo(id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(uniqueMatches)]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {uniqueMatches.map((m, idx) => {
        const details = hpoDetails[m.id];
        const isValid = details?.valid;
        const expanded = openIdx === idx;
        return (
          <div
            key={m.id}
            style={{
              background: '#fff',
              border: '1.5px solid #ccc',
              borderRadius: 8,
              padding: '12px 14px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              fontSize: 14,
              color: '#222',
              minWidth: 0,
              transition: 'box-shadow 0.2s, border 0.2s',
            }}
          >
            {/* HPO term name as clickable, fallback to ID if not loaded */}
            <button
              style={{
                fontWeight: 'bold',
                color: '#111',
                fontSize: 17,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                marginBottom: 6,
                textDecoration: 'none',
                width: '100%',
                textAlign: 'left',
              }}
              onClick={() => setOpenIdx(expanded ? null : idx)}
              disabled={fetching[m.id]}
              aria-expanded={expanded}
            >
              {fetching[m.id]
                ? 'Loading...'
                : (
                  <>
                    {details?.name || m.id}
                    <span style={{ color: '#888', fontWeight: 'normal', fontSize: 15, marginLeft: 8 }}>
                      {details?.id ? `(${details.id})` : `(${m.id})`}
                    </span>
                  </>
                )}
            </button>
            {/* Expand details below the button if expanded */}
            {expanded && (
              <div style={{ marginTop: 10 }}>
                {fetching[m.id] ? (
                  <div style={{ textAlign: 'center', color: '#888', fontSize: 16 }}>Loading...</div>
                ) : isValid === true ? (
                  <>
                    <div style={{ color: '#888', fontSize: 13, marginBottom: 2 }}> {details.definition}</div>
                    {details.synonyms && details.synonyms.length > 0 && (
                      <div style={{ color: '#888', fontSize: 13 }}>
                        <span style={{ color: '#444', fontWeight: 'bold', fontSize: 14 }}>Synonym:</span>
                        <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {details.synonyms.map((syn, sidx) => (
                            <span key={sidx} style={{ background: '#eee', color: '#555', borderRadius: 4, padding: '2px 6px', fontSize: 12, marginRight: 4, marginBottom: 2, display: 'inline-block' }}>{syn}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : isValid === false ? (
                  <span style={{ color: '#f87171' }}>Invalid HPO ID</span>
                ) : (
                  <div style={{ textAlign: 'center', color: '#888', fontSize: 16 }}>Loading...</div>
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