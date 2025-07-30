import React, { useState } from 'react';
import './EvaluationPage.css';

const CORPORA = [
  { key: 'gold_corpus', label: 'Gold Corpus' },
  { key: 'gold_corpus_small', label: 'Gold Corpus Small' },
  { key: 'gold_corpus_tiny', label: 'Gold Corpus Tiny' },
];

const TOOL_RESULTS = {
  gold_corpus: [
    { tool: 'PhenoBERT', accuracy: 87.3, precision: 81.2, recall: 84.5, f1: 82.8 },
    { tool: 'PhenoTagger', accuracy: 85.1, precision: 79.0, recall: 82.2, f1: 80.5 },
  ],
  gold_corpus_small: [
    { tool: 'PhenoBERT', accuracy: 83.2, precision: 77.5, recall: 80.1, f1: 78.8 },
    { tool: 'PhenoTagger', accuracy: 81.0, precision: 75.0, recall: 77.9, f1: 76.4 },
  ],
  gold_corpus_tiny: [
    { tool: 'PhenoBERT', accuracy: 78.9, precision: 72.3, recall: 75.5, f1: 73.8 },
    { tool: 'PhenoTagger', accuracy: 77.0, precision: 70.0, recall: 73.2, f1: 71.5 },
  ],
};

const METRICS = [
  { key: 'accuracy', label: 'Accuracy', color: '#3b82f6' },
  { key: 'precision', label: 'Precision', color: '#10b981' },
  { key: 'recall', label: 'Recall', color: '#f59e0b' },
  { key: 'f1', label: 'F1', color: '#ef4444' },
];

function BarChart({ selectedCorpora, selectedMetrics }) {
  // Gather all unique tools
  const allTools = Array.from(
    new Set(
      selectedCorpora.flatMap((corpusKey) =>
        (TOOL_RESULTS[corpusKey] || []).map((r) => r.tool)
      )
    )
  );
  // Fixed width and height
  const width = 760;
  const height = 300;
  const margin = { top: 60, right: 30, bottom: 50, left: 50 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const barGroupWidth = chartWidth / allTools.length;
  // Each group: (num corpora) * (num metrics) bars
  const barsPerGroup = selectedCorpora.length * selectedMetrics.length;
  const barWidth = barGroupWidth / (barsPerGroup + 1);
  // Y scale (0-100)
  const yMax = 100;

  // Colors for metrics
  const metricColors = METRICS.map(m => m.color);

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
        {allTools.map((tool, i) => (
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
        {allTools.map((tool, i) =>
          selectedCorpora.flatMap((corpusKey, j) =>
            selectedMetrics.map((metricKey, k) => {
              const toolResult = (TOOL_RESULTS[corpusKey] || []).find((r) => r.tool === tool);
              const value = toolResult ? toolResult[metricKey] : 0;
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
                  <title>{`${tool} (${CORPORA.find(c => c.key === corpusKey)?.label || corpusKey}, ${METRICS.find(m => m.key === metricKey)?.label}): ${value}`}</title>
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
              {CORPORA.find(c => c.key === corpusKey)?.label || corpusKey}
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
        Value
      </text>
    </svg>
  );
}

function EvaluationPage() {
  const [selectedCorpora, setSelectedCorpora] = useState([]);
  const [selectedMetrics, setSelectedMetrics] = useState(['accuracy']);

  const handleCheckboxChange = (corpusKey) => {
    setSelectedCorpora((prev) =>
      prev.includes(corpusKey)
        ? prev.filter((key) => key !== corpusKey)
        : [...prev, corpusKey]
    );
  };

  const handleMetricChange = (metricKey) => {
    setSelectedMetrics((prev) =>
      prev.includes(metricKey)
        ? prev.filter((key) => key !== metricKey)
        : [...prev, metricKey]
    );
  };

  return (
    <div className="evaluation-container">
      <h1 className="evaluation-title">Evaluation Results</h1>
      <div className="evaluation-section-list">
        <div className="evaluation-card">
          <h2 className="evaluation-section-title">Select Corpora</h2>
          <div className="corpus-selector">
            {CORPORA.map((corpus) => (
              <label key={corpus.key}>
                <input
                  type="checkbox"
                  name="corpus"
                  value={corpus.key}
                  checked={selectedCorpora.includes(corpus.key)}
                  onChange={() => handleCheckboxChange(corpus.key)}
                />
                {corpus.label}
              </label>
            ))}
          </div>
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
          {selectedCorpora.length === 0 || selectedMetrics.length === 0 ? (
            <div style={{ color: '#888', margin: '2rem 0' }}>Select at least one corpus and one metric to see the graph.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <BarChart selectedCorpora={selectedCorpora} selectedMetrics={selectedMetrics} />
            </div>
          )}
        </div>
        {selectedCorpora.length === 0 ? (
          <div className="evaluation-card" style={{ color: '#888', marginTop: '2rem' }}>No corpus selected.</div>
        ) : (
          selectedCorpora.map((corpusKey) => (
            <div className="evaluation-card" key={corpusKey}>
              <h2 className="evaluation-section-title">{CORPORA.find(c => c.key === corpusKey).label} Performance Results</h2>
              <table className="evaluation-table">
                <thead>
                  <tr>
                    <th>Tool</th>
                    <th>Accuracy</th>
                    <th>Precision</th>
                    <th>Recall</th>
                    <th>F1</th>
                  </tr>
                </thead>
                <tbody>
                  {TOOL_RESULTS[corpusKey].map((result) => (
                    <tr key={result.tool}>
                      <td>{result.tool}</td>
                      <td>{result.accuracy}</td>
                      <td>{result.precision}</td>
                      <td>{result.recall}</td>
                      <td>{result.f1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default EvaluationPage; 