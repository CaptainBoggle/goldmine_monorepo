import { useState } from 'react';
import { ModelSelector, FileInput, TextInput, ActionButtons, ModelOutput } from '../components';
import './InferencePage.css';

function InferencePage({ tools, selectedTool, setSelectedTool, callApi, loading, result }) {
  const [input, setInput] = useState('The last child is a 6-year-old boy. At 36 weeks 3D ultrasonography showed telecanthus, short nose, long philtrum and short femur (Fig. 3A).');
  const [inputMode, setInputMode] = useState('text'); // 'text' or 'file'
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFileSelect = (content, name) => {
    setFileContent(content);
    setFileName(name);
  };

  const handleRunAnalysis = () => {
    let dataToSend;
    
    if (inputMode === 'file') {
      if (!fileContent.trim()) {
        alert('Please select a file first.');
        return;
      }
      
      dataToSend = {
        sentences: fileContent.split('\n').filter(s => s.trim())
      };
    } else {
      dataToSend = {
        sentences: input.split('\n').filter(s => s.trim())
      };
    }

    callApi('/predict', 'POST', dataToSend);
  };

  return (
    <div className="inference-container">
      <div className="inference-grid">
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
        {/* RIGHT SIDE - Output Section */}
        <div className="inference-right">
          <div className="inference-card">
            <h2 className="inference-section-title">Model Actions</h2>
            <ActionButtons callApi={callApi} />
          </div>
          <div className="inference-card">
            <h2 className="inference-section-title">Analysis Results</h2>
            <ModelOutput loading={loading} result={result} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default InferencePage; 