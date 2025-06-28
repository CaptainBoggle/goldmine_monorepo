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
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="mt-6 sm:mt-8 lg:mt-12">
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
        </main>
      </div>
    </div>
  );
}

export default App;

