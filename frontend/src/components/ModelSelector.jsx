function ModelSelector({ tools, selectedTool, setSelectedTool }) {
  return (
    <div>
      <label className="block font-semibold mb-1">Model:</label>
      <select
        className="w-full border rounded px-4 py-2"
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