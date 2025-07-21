import React from 'react';

function SelectionForm({ 
  tools, 
  corpora, 
  selectedTool, 
  selectedCorpus, 
  selectedCorpusVersion,
  onToolChange,
  onCorpusChange,
  onCorpusVersionChange,
  isOperationRunning 
}) {
  return (
    <div className="performance-form-grid">
      <div className="performance-form-group">
        <label className="performance-form-label">
          Select Tool
        </label>
        <select
          value={selectedTool}
          onChange={(e) => onToolChange(e.target.value)}
          className="performance-form-select"
          disabled={isOperationRunning}
        >
          <option value="">Choose a tool...</option>
          {tools.map((tool) => (
            <option key={tool.id} value={tool.id}>
              {tool.id}
            </option>
          ))}
        </select>
      </div>
      <div className="performance-form-group">
        <label className="performance-form-label">
          Select Corpus
        </label>
        <select
          value={selectedCorpus}
          onChange={(e) => onCorpusChange(e.target.value)}
          className="performance-form-select"
          disabled={isOperationRunning}
        >
          <option value="">Choose a corpus...</option>
          {corpora.map((corpus) => (
            <option key={corpus.name} value={corpus.name}>
              {corpus.name}
            </option>
          ))}
        </select>
      </div>
      <div className="performance-form-group">
        <label className="performance-form-label">
          Corpus Version
        </label>
        <select
          value={selectedCorpusVersion}
          onChange={(e) => onCorpusVersionChange(e.target.value)}
          className="performance-form-select"
          disabled={isOperationRunning}
        >
          <option value="">Choose version...</option>
          {corpora
            .filter((corpus) => corpus.name === selectedCorpus)
            .map((corpus) => (
              <option key={corpus.corpus_version} value={corpus.corpus_version}>
                {corpus.corpus_version}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
}

export default SelectionForm; 