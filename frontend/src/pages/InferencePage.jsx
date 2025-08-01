import { useState, useEffect } from 'react';
import { ModelSelector, FileInput, TextInput, ActionButtons, ModelOutput, ModelActionOutput } from '../components';
import HpoTermList from '../components/HpoTermList';
import './InferencePage.css';

function InferencePage({ tools, selectedTool, setSelectedTool, callApi, loading, result }) {
  const [input, setInput] = useState('The last child is a 6-year-old boy. At 36 weeks 3D ultrasonography showed telecanthus, short nose, long philtrum and short femur (Fig. 3A).');
  const [inputMode, setInputMode] = useState('text'); // 'text' or 'file'
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [lastAnalyzedText, setLastAnalyzedText] = useState('');
  const [lastAction, setLastAction] = useState(''); // Track the last action performed

  // Load lastAnalyzedText from localStorage on component mount
  useEffect(() => {
    const saved = localStorage.getItem('inference_lastAnalyzedText');
    if (saved) {
      setLastAnalyzedText(saved);
    }
  }, []);

  // Parse result JSON and extract matches for HPO term list
  let parsedResult = null;
  let matches = [];
  try {
    parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
    // Flatten all matches from all sentences
    matches = (parsedResult?.results || []).flat();
  } catch (e) {}

  const handleFileSelect = (content, name) => {
    setFileContent(content);
    setFileName(name);
  };

  const handleRunAnalysis = () => {
    let dataToSend;
    let textToAnalyze;
    
    if (inputMode === 'file') {
      if (!fileContent.trim()) {
        alert('Please select a file first.');
        return;
      }
      
      dataToSend = {
        sentences: fileContent.split('\n').filter(s => s.trim())
      };
      textToAnalyze = fileContent;
    } else {
      dataToSend = {
        sentences: input.split('\n').filter(s => s.trim())
      };
      textToAnalyze = input;
    }
    setLastAnalyzedText(textToAnalyze);
    localStorage.setItem('inference_lastAnalyzedText', textToAnalyze);
    setLastAction('predict'); // Mark this as a prediction action
    callApi('/predict', 'POST', dataToSend);
  };

  // Wrapper function to track action type
  const handleAction = (endpoint, method = 'GET') => {
    setLastAction(endpoint.replace('/', '')); // Remove leading slash
    callApi(endpoint, method);
  };

  return (
    <div className="inference-container">
      <div
        className={matches.length > 0 && !loading ? 'inference-grid inference-grid-hpo' : 'inference-grid'}
        style={{ justifyContent: matches.length > 0 && !loading ? 'start' : 'center', transition: 'justify-content 0.3s' }}
      >
        {/* LEFT SIDE - Input Section */}
        <div className="inference-left">
          <div className="inference-card">
            <h2 className="inference-section-title">Model Configuration</h2>
            <ModelSelector 
              tools={tools} 
              selectedTool={selectedTool} 
              setSelectedTool={setSelectedTool} 
            />
          </div>
          <div className="inference-card">
            <h2 className="inference-section-title">Input Method</h2>
            <div className="space-y-4">
              <div className="inference-toggle-row">
                <button
                  type="button"
                  onClick={() => setInputMode('text')}
                  className={`inference-toggle-btn ${inputMode === 'text' ? 'inference-toggle-btn-active' : 'inference-toggle-btn-inactive'}`}
                >
                  <span className="hidden sm:inline">Text Input</span>
                  <span className="sm:hidden">Text</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('file')}
                  className={`inference-toggle-btn ${inputMode === 'file' ? 'inference-toggle-btn-active' : 'inference-toggle-btn-inactive'}`}
                >
                  <span className="hidden sm:inline">File Input</span>
                  <span className="sm:hidden">File</span>
                </button>
              </div>
            </div>
          </div>
          <div className="inference-card">
            <h2 className="inference-section-title">Input Data</h2>
            <div className="inference-input-anim">
              {inputMode === 'file' ? (
                <FileInput onFileSelect={handleFileSelect} />
              ) : (
                <TextInput 
                  input={input} 
                  setInput={setInput} 
                />
              )}
            </div>
          </div>
          <div className="inference-card">
            <button
              className="inference-run-btn"
              onClick={handleRunAnalysis}
              disabled={inputMode === 'text' ? !input.trim() : !fileContent.trim()}
            >
              {loading ? 'Processing...' : 'Run Analysis'}
            </button>
          </div>
        </div>
        {/* CENTER - Output Section */}
        <div className="inference-center">
          <div className="inference-card">
            <h2 className="inference-section-title">Model Actions</h2>
            <ActionButtons callApi={handleAction} />
            {/* Show formatted action output */}
            {result && lastAction && lastAction !== 'predict' && (
              <ModelActionOutput result={result} loading={loading} />
            )}
          </div>
          <div className="inference-card">
            <h2 className="inference-section-title">Analysis Results</h2>
            <ModelOutput 
              loading={loading} 
              result={result} 
              originalText={lastAnalyzedText}
            />
            {/* HPO Term List inside the Analysis Results card */}
            {matches.length > 0 && !loading && (
              <>
                <hr style={{ margin: '2rem 0' }} />
                <h3 className="inference-section-title" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Identified HPO Terms</h3>
                <HpoTermList matches={matches} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default InferencePage; 