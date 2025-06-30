import './ModelSelector.css';

function ModelSelector({ tools, selectedTool, setSelectedTool }) {
  return (
    <div className="model-selector-container">
      <label className="model-selector-label">Model:</label>
      <select
        className="model-selector-select"
        value={selectedTool}
        onChange={e => setSelectedTool(e.target.value)}
      >
        {tools.map(t => (
          <option key={t.id} value={t.id}>
            {t.id}
          </option>
        ))}
      </select>
    </div>
  );
}

export default ModelSelector; 