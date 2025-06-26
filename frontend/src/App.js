import { useState, useEffect } from 'react';

function App() {
  const [tools, setTools] = useState([]);
  const [selectedTool, setSelectedTool] = useState('');
  const [input, setInput] = useState('Patient has fever and seizures');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/tools/')
      .then(r => r.json())
      .then(data => {
        setTools(Array.isArray(data) ? data : []);
        if (data.length > 0) setSelectedTool(data[0].id);
      })
      .catch(e => console.error(e));
  }, []);

  const callApi = async (endpoint, method = 'GET', body = null) => {
    setLoading(true);
    setResult('');
    try {
      const response = await fetch(`/api/proxy/${selectedTool}${endpoint}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : null
      });
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setResult(`Error: ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <div style={{padding: '20px', fontFamily: 'monospace'}}>
      <h1>goldmine test</h1>
      
      <div style={{marginBottom: '20px'}}>
        <h3>Tools:</h3>
        {tools.map(t => <div key={t.id}>{t.id} - {t.container_name}</div>)}
      </div>

      {tools.length > 0 && (
        <div style={{marginBottom: '20px'}}>
          <label>Select tool: </label>
          <select value={selectedTool} onChange={e => setSelectedTool(e.target.value)}>
            {tools.map(t => <option key={t.id} value={t.id}>{t.id}</option>)}
          </select>
        </div>
      )}

      <div style={{marginBottom: '20px'}}>
        <button onClick={() => callApi('/status')}>Status</button>
        <button onClick={() => callApi('/info')}>Info</button>
        <button onClick={() => callApi('/load', 'POST')}>Load</button>
        <button onClick={() => callApi('/unload', 'POST')}>Unload</button>
      </div>

      <div style={{marginBottom: '20px'}}>
        <div>Test input:</div>
        <textarea 
          value={input} 
          onChange={e => setInput(e.target.value)}
          rows={3}
          style={{width: '100%'}}
        />
        <button 
          onClick={() => callApi('/predict', 'POST', {sentences: input.split('\n').filter(s => s.trim())})}
          disabled={!input.trim()}
        >
          Predict
        </button>
      </div>

      {loading && <div>loading</div>}
      
      {result && (
        <div>
          <h3>Result:</h3>
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
}

export default App;
