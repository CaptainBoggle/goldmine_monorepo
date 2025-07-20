import { Navigation } from './components';
import { InferencePage, PerformancePage, AboutPage } from './pages';
import { useTools, useApiCall, useNavigation } from './hooks';

function App() {
  const { tools, selectedTool, setSelectedTool, error: toolsError, fetchTools } = useTools();
  const { loading, result, error: apiError, callApi } = useApiCall();
  const { activeTab, setActiveTab } = useNavigation();

  // Create a wrapper function for callApi that includes the selectedTool
  const handleApiCall = (endpoint, method = 'GET', body = null) => {
    return callApi(selectedTool, endpoint, method, body);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Error Display */}
        {(toolsError || apiError) && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="text-red-700">
              {toolsError && (
                <div className="mb-2">
                  <p className="font-medium">Tools Error: {toolsError}</p>
                  <button 
                    onClick={fetchTools}
                    className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                  >
                    Retry Fetch Tools
                  </button>
                </div>
              )}
              {apiError && (
                <p className="font-medium">API Error: {apiError}</p>
              )}
            </div>
          </div>
        )}

        <main className="mt-6 sm:mt-8 lg:mt-12">
          {activeTab === 'Inference' && (
            <InferencePage
              tools={tools}
              selectedTool={selectedTool}
              setSelectedTool={setSelectedTool}
              callApi={handleApiCall}
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

