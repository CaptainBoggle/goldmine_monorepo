import React, { useState, useMemo } from 'react';
import './EvaluationPage.css';
import { useEvaluationAPI } from '../hooks/useEvaluationAPI';
import MessageDisplay from '../components/MessageDisplay';

const METRICS = [
  { key: 'accuracy', label: 'Accuracy', color: '#3b82f6' },
  { key: 'precision', label: 'Precision', color: '#10b981' },
  { key: 'recall', label: 'Recall', color: '#f59e0b' },
  { key: 'f1', label: 'F1', color: '#ef4444' },
  { key: 'jaccard', label: 'Jaccard', color: '#8b5cf6' },
];

function BarChart({ selectedCorpora, selectedMetrics, metricsData, tools }) {
  // Get unique tools that have data for the selected corpora
  const toolsWithData = useMemo(() => {
    const toolSet = new Set();
    selectedCorpora.forEach(corpusKey => {
      Object.values(metricsData).forEach(data => {
        if (data.corpus === corpusKey) {
          toolSet.add(data.tool);
        }
      });
    });
    return Array.from(toolSet);
  }, [selectedCorpora, metricsData]);

  // Fixed width and height
  const width = 760;
  const height = 300;
  const margin = { top: 60, right: 30, bottom: 50, left: 50 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const barGroupWidth = chartWidth / Math.max(toolsWithData.length, 1);
  // Each group: (num corpora) * (num metrics) bars
  const barsPerGroup = selectedCorpora.length * selectedMetrics.length;
  const barWidth = barGroupWidth / Math.max(barsPerGroup + 1, 1);
  // Y scale (0-100)
  const yMax = 100;

  // Colors for metrics
  const metricColors = METRICS.map(m => m.color);

  if (toolsWithData.length === 0) {
    return (
      <div style={{ 
        width, 
        height, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f9fafb', 
        borderRadius: 12, 
        boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
        color: '#6b7280',
        fontSize: 16
      }}>
        No data available for the selected corpora
      </div>
    );
  }

  return (
    <svg width={width} height={height} style={{ background: '#f9fafb', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
      {/* Y axis */}
      <g>
        {[0, 20, 40, 60, 80, 100].map((y) => (
          <g key={y}>
            <line
              x1={margin.left}
              x2={width - margin.right}
              y1={margin.top + chartHeight - (y / yMax) * chartHeight}
              y2={margin.top + chartHeight - (y / yMax) * chartHeight}
              stroke="#e5e7eb"
            />
            <text
              x={margin.left - 8}
              y={margin.top + chartHeight - (y / yMax) * chartHeight + 4}
              fontSize={12}
              fill="#6b7280"
              textAnchor="end"
            >
              {y}
            </text>
          </g>
        ))}
      </g>
      {/* X axis labels */}
      <g>
        {toolsWithData.map((tool, i) => (
          <text
            key={tool}
            x={margin.left + barGroupWidth * i + barGroupWidth / 2}
            y={height - margin.bottom + 24}
            fontSize={14}
            fill="#374151"
            textAnchor="middle"
            fontWeight={600}
          >
            {tool}
          </text>
        ))}
      </g>
      {/* Bars */}
      <g>
        {toolsWithData.map((tool, i) =>
          selectedCorpora.flatMap((corpusKey, j) =>
            selectedMetrics.map((metricKey, k) => {
              // Find the data for this tool-corpus combination
              const dataKey = Object.keys(metricsData).find(key => 
                metricsData[key].tool === tool && metricsData[key].corpus === corpusKey
              );
              const data = dataKey ? metricsData[dataKey] : null;
              const value = data ? (data[metricKey] * 100) : 0; // Convert to percentage
              const barIdx = j * selectedMetrics.length + k;
              return (
                <rect
                  key={tool + corpusKey + metricKey}
                  x={margin.left + barGroupWidth * i + barWidth * barIdx}
                  y={margin.top + chartHeight - (value / yMax) * chartHeight}
                  width={barWidth * 0.8}
                  height={(value / yMax) * chartHeight}
                  fill={metricColors[k % metricColors.length]}
                  opacity={0.85}
                >
                  <title>{`${tool} (${corpusKey}, ${METRICS.find(m => m.key === metricKey)?.label}): ${value.toFixed(1)}%`}</title>
                </rect>
              );
            })
          )
        )}
      </g>
      {/* X axis line */}
      <line
        x1={margin.left}
        x2={width - margin.right}
        y1={margin.top + chartHeight}
        y2={margin.top + chartHeight}
        stroke="#d1d5db"
      />
      {/* Legend for corpora */}
      <g>
        {selectedCorpora.map((corpusKey, j) => (
          <g key={corpusKey}>
            <rect
              x={margin.left + j * 140}
              y={18}
              width={18}
              height={12}
              fill="#e5e7eb"
              opacity={0.85}
              rx={2}
            />
            <text
              x={margin.left + j * 140 + 24}
              y={28}
              fontSize={13}
              fill="#374151"
            >
              {corpusKey}
            </text>
          </g>
        ))}
      </g>
      {/* Legend for metrics */}
      <g>
        {selectedMetrics.map((metricKey, k) => (
          <g key={metricKey}>
            <rect
              x={margin.left + k * 110}
              y={38}
              width={18}
              height={12}
              fill={metricColors[k % metricColors.length]}
              opacity={0.85}
              rx={2}
            />
            <text
              x={margin.left + k * 110 + 24}
              y={48}
              fontSize={13}
              fill="#374151"
            >
              {METRICS.find(m => m.key === metricKey)?.label || metricKey}
            </text>
          </g>
        ))}
      </g>
      {/* Y axis label */}
      <text
        x={margin.left - 36}
        y={margin.top + chartHeight / 2}
        fontSize={14}
        fill="#374151"
        textAnchor="middle"
        transform={`rotate(-90,${margin.left - 36},${margin.top + chartHeight / 2})`}
        fontWeight={600}
      >
        Percentage
      </text>
    </svg>
  );
}

function EvaluationPage() {
  const { tools, corpora, metricsData, isLoading, error, clearError, refreshData, lastFetchTime, hasInitialData, lastUpdatedCorpus } = useEvaluationAPI();
  const [selectedCorpus, setSelectedCorpus] = useState('');
  const [selectedCorpusVersion, setSelectedCorpusVersion] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState(['accuracy']);

  // Get unique corpus names and their versions from the data
  const availableCorpora = useMemo(() => {
    // First, get corpora from metrics data (existing data)
    const corpusMap = new Map();
    Object.values(metricsData).forEach(data => {
      if (!corpusMap.has(data.corpus)) {
        corpusMap.set(data.corpus, new Set());
      }
      corpusMap.get(data.corpus).add(data.corpusVersion);
    });
    
    // Also include all corpora from the corpora list (even if no metrics yet)
    corpora.forEach(corpus => {
      if (!corpusMap.has(corpus.name)) {
        corpusMap.set(corpus.name, new Set());
      }
      corpusMap.get(corpus.name).add(corpus.corpus_version);
    });
    
    // Convert to array of objects with corpus name and versions
    return Array.from(corpusMap.entries()).map(([corpusName, versions]) => ({
      name: corpusName,
      versions: Array.from(versions).sort()
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [metricsData, corpora]);

  // Get available versions for the selected corpus
  const availableVersions = useMemo(() => {
    const corpus = availableCorpora.find(c => c.name === selectedCorpus);
    return corpus ? corpus.versions : [];
  }, [availableCorpora, selectedCorpus]);

  const handleCorpusChange = (corpusName) => {
    setSelectedCorpus(corpusName);
    setSelectedCorpusVersion(''); // Reset version when corpus changes
  };

  const handleVersionChange = (version) => {
    setSelectedCorpusVersion(version);
  };

  const handleMetricChange = (metricKey) => {
    setSelectedMetrics((prev) =>
      prev.includes(metricKey)
        ? prev.filter((key) => key !== metricKey)
        : [...prev, metricKey]
    );
  };

  const handleRefresh = () => {
    if (selectedCorpus && selectedCorpusVersion) {
      refreshData(selectedCorpus, selectedCorpusVersion);
    }
    // No fallback - only refresh if something is selected
  };

  // Check if refresh button should be disabled
  const isRefreshDisabled = !selectedCorpus || !selectedCorpusVersion || isLoading;

  // Get data for the selected corpus and version
  const getCorpusData = (corpusKey, versionKey) => {
    return Object.values(metricsData)
      .filter(data => data.corpus === corpusKey && data.corpusVersion === versionKey)
      .map(data => ({
        tool: data.tool,
        accuracy: (data.accuracy || 0) * 100, // Convert to percentage
        precision: (data.precision || 0) * 100, // Convert to percentage
        recall: (data.recall || 0) * 100, // Convert to percentage
        f1: (data.f1 || 0) * 100, // Convert to percentage
        jaccard: (data.jaccard || 0) * 100, // Convert to percentage
      }));
  };

  // Find the best scores for each metric
  const getBestScores = (data) => {
    if (data.length === 0) return {};
    
    const bestScores = {
      accuracy: Math.max(...data.map(d => d.accuracy)),
      precision: Math.max(...data.map(d => d.precision)),
      recall: Math.max(...data.map(d => d.recall)),
      f1: Math.max(...data.map(d => d.f1)),
      jaccard: Math.max(...data.map(d => d.jaccard))
    };
    
    return bestScores;
  };

  // Get the data and best scores
  const corpusData = getCorpusData(selectedCorpus, selectedCorpusVersion);
  const bestScores = getBestScores(corpusData);

  return (
    <div className="evaluation-container">
      <h1 className="evaluation-title">Evaluation Results</h1>
      
      {/* Error Messages */}
      <MessageDisplay 
        error={error}
        onClearError={clearError}
      />

      <div className="evaluation-section-list">
        <div className="evaluation-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="evaluation-section-title" style={{ marginBottom: 0 }}>Select Corpus and Version</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {lastUpdatedCorpus && (
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  Last updated: {lastUpdatedCorpus}
                </div>
              )}
              <button 
                onClick={handleRefresh}
                disabled={isRefreshDisabled}
                style={{ 
                  padding: '0.5rem 1rem',
                  backgroundColor: isRefreshDisabled ? '#9ca3af' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: isRefreshDisabled ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                {isLoading ? 'Refreshing...' : 'Refresh Data'}
              </button>
            </div>
          </div>
          
          {isLoading ? (
            <div style={{ color: '#888', margin: '1rem 0' }}>Loading data...</div>
          ) : availableCorpora.length === 0 ? (
            <div style={{ color: '#888', margin: '1rem 0' }}>
              <div>No evaluation data available. Please run evaluations on the Performance page first.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  Corpus:
                </label>
                <select
                  value={selectedCorpus}
                  onChange={(e) => handleCorpusChange(e.target.value)}
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    minWidth: '200px'
                  }}
                >
                  <option value="">Select a corpus</option>
                  {availableCorpora.map((corpus) => (
                    <option key={corpus.name} value={corpus.name}>
                      {corpus.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCorpus && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Version:
                  </label>
                  <select
                    value={selectedCorpusVersion}
                    onChange={(e) => handleVersionChange(e.target.value)}
                    style={{
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      minWidth: '150px'
                    }}
                  >
                    <option value="">Select a version</option>
                    {availableVersions.map((version) => (
                      <option key={version} value={version}>
                        {version}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="evaluation-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            <h2 className="evaluation-section-title" style={{ marginBottom: 0 }}>Comparison Graph</h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {METRICS.map(m => (
                <label key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 15 }}>
                  <input
                    type="checkbox"
                    checked={selectedMetrics.includes(m.key)}
                    onChange={() => handleMetricChange(m.key)}
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>
          {(!selectedCorpus || !selectedCorpusVersion || selectedMetrics.length === 0) ? (
            <div style={{ color: '#888', margin: '2rem 0' }}>
              {!selectedCorpus || !selectedCorpusVersion 
                ? 'Select a corpus and version, and at least one metric to see the graph.'
                : 'Select at least one metric to see the graph.'
              }
            </div>
          ) : (
            <div>
              <BarChart 
                selectedCorpora={[selectedCorpus]} 
                selectedMetrics={selectedMetrics} 
                metricsData={metricsData}
                tools={tools}
              />
            </div>
          )}
        </div>

        {!selectedCorpus || !selectedCorpusVersion ? (
          <div className="evaluation-card" style={{ color: '#888', marginTop: '2rem' }}>
            {!selectedCorpus ? 'No corpus selected.' : 'No version selected.'}
          </div>
        ) : (
          <div className="evaluation-card">
            <h2 className="evaluation-section-title">{selectedCorpus} ({selectedCorpusVersion}) Performance Results</h2>
            {corpusData.length === 0 ? (
              <div style={{ color: '#888', margin: '1rem 0' }}>No data available for this corpus and version.</div>
            ) : (
              <table className="evaluation-table">
                <thead>
                  <tr>
                    <th>Tool</th>
                    <th>Accuracy</th>
                    <th>Precision</th>
                    <th>Recall</th>
                    <th>F1</th>
                    <th>Jaccard</th>
                  </tr>
                </thead>
                <tbody>
                  {corpusData.map((result) => (
                    <tr key={result.tool}>
                      <td>{result.tool}</td>
                      <td style={{ 
                        color: result.accuracy === bestScores.accuracy ? '#10b981' : '#374151',
                        fontWeight: result.accuracy === bestScores.accuracy ? '600' : '400'
                      }}>
                        {result.accuracy.toFixed(1)}%
                      </td>
                      <td style={{ 
                        color: result.precision === bestScores.precision ? '#10b981' : '#374151',
                        fontWeight: result.precision === bestScores.precision ? '600' : '400'
                      }}>
                        {result.precision.toFixed(1)}%
                      </td>
                      <td style={{ 
                        color: result.recall === bestScores.recall ? '#10b981' : '#374151',
                        fontWeight: result.recall === bestScores.recall ? '600' : '400'
                      }}>
                        {result.recall.toFixed(1)}%
                      </td>
                      <td style={{ 
                        color: result.f1 === bestScores.f1 ? '#10b981' : '#374151',
                        fontWeight: result.f1 === bestScores.f1 ? '600' : '400'
                      }}>
                        {result.f1.toFixed(1)}%
                      </td>
                      <td style={{ 
                        color: result.jaccard === bestScores.jaccard ? '#10b981' : '#374151',
                        fontWeight: result.jaccard === bestScores.jaccard ? '600' : '400'
                      }}>
                        {result.jaccard.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default EvaluationPage; 