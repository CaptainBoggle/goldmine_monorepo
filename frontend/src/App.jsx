import { useState, useEffect } from 'react';
import { Navigation } from './components';
import { InferencePage, PerformancePage, AboutPage } from './pages';

function App() {
  const [tools, setTools] = useState([]);
  const [selectedTool, setSelectedTool] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Inference');

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
    <div className="min-h-screen bg-white p-8 font-sans">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === 'Inference' && (
        <InferencePage
          tools={tools}
          selectedTool={selectedTool}
          setSelectedTool={setSelectedTool}
          callApi={callApi}
          loading={loading}
          result={result}
        />
      )}

      {activeTab === 'Performance' && <PerformancePage />}

      {activeTab === 'About' && <AboutPage />}
    </div>
  );
}

export default App;

