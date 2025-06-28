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

  const [activeTab, setActiveTab] = useState('Inference');

  return (
    <div className="min-h-screen bg-white p-8 font-sans">
      {/* Title */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Phenotype ID</h1>
        <div className="flex space-x-10 text-gray-500 text-lg">
          {['Inference', 'Performance', 'About'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 pb-1 ${
                activeTab === tab ? 'text-black font-semibold border-black' : 'border-transparent'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Inference Page */}
      {activeTab === 'Inference' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* LEFT SIDE */}
          <div className="space-y-6">
            {/* Model Selector */}
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

            {/* File Input */}
            <div>
              <label className="block font-semibold mb-1">File:</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 border rounded px-4 py-2"
                  placeholder="sample.json"
                  disabled
                />
                <button className="px-3 py-2 rounded bg-black text-white text-lg">+</button>
              </div>
            </div>

            {/* Text Input */}
            <div>
              <label className="block font-semibold mb-1">Text Input:</label>
              <textarea
                className="w-full border rounded px-4 py-2"
                rows={3}
                value={input}
                onChange={e => setInput(e.target.value)}
              />
            </div>

            {/* Run Button */}
            <button
              className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800"
              onClick={() =>
                callApi('/predict', 'POST', {
                  sentences: input.split('\n').filter(s => s.trim()),
                })
              }
              disabled={!input.trim()}
            >
              Run
            </button>
          </div>

          {/* RIGHT SIDE */}
          <div className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <button className="px-4 py-2 border rounded" onClick={() => callApi('/status')}>
                Status
              </button>
              <button className="px-4 py-2 border rounded" onClick={() => callApi('/info')}>
                Info
              </button>
              <button className="px-4 py-2 border rounded" onClick={() => callApi('/load', 'POST')}>
                Load
              </button>
              <button
                className="px-4 py-2 border rounded"
                onClick={() => callApi('/unload', 'POST')}
              >
                Unload
              </button>
            </div>

            <div>
              <label className="block font-semibold mb-1">Model Output:</label>
              <input className="w-full border rounded px-4 py-2" value="output" disabled />
            </div>

            {loading && <div className="text-gray-500">loading...</div>}

            {result && (
              <div>
                <h3 className="font-semibold mb-1">Result:</h3>
                <pre className="bg-gray-100 p-4 rounded overflow-x-auto whitespace-pre-wrap">
                  {result}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Performance Page */}
      {activeTab === 'Performance' && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Performance</h2>
          <p>Performance metrics will go here.</p>
        </div>
      )}

      {/* About Page */}
      {activeTab === 'About' && (
        <div>
          <h2 className="text-2xl font-bold mb-4">About</h2>
          <p>This tool allows users to select models, provide input data, and run phenotype predictions.</p>
        </div>
      )}
    </div>
  );
}

export default App;

