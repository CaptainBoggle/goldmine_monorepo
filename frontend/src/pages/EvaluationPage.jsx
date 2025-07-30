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
    { tool: 'PhenoGPT', accuracy: 85.1, precision: 79.0, recall: 82.2, f1: 80.5 },
  ],
  gold_corpus_small: [
    { tool: 'PhenoBERT', accuracy: 83.2, precision: 77.5, recall: 80.1, f1: 78.8 },
    { tool: 'PhenoGPT', accuracy: 81.0, precision: 75.0, recall: 77.9, f1: 76.4 },
  ],
  gold_corpus_tiny: [
    { tool: 'PhenoBERT', accuracy: 78.9, precision: 72.3, recall: 75.5, f1: 73.8 },
    { tool: 'PhenoGPT', accuracy: 77.0, precision: 70.0, recall: 73.2, f1: 71.5 },
  ],
};

function EvaluationPage() {
  const [selectedCorpora, setSelectedCorpora] = useState([CORPORA[0].key]);

  const handleCheckboxChange = (corpusKey) => {
    setSelectedCorpora((prev) =>
      prev.includes(corpusKey)
        ? prev.filter((key) => key !== corpusKey)
        : [...prev, corpusKey]
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