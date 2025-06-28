import { useState } from 'react';
import { ModelSelector, FileInput, TextInput, ActionButtons, ModelOutput } from '../components';

function InferencePage({ tools, selectedTool, setSelectedTool, callApi, loading, result }) {
  const [input, setInput] = useState('Patient has fever and seizures');
  const [inputMode, setInputMode] = useState('text'); // 'text' or 'file'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* LEFT SIDE - Input Section */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Model Configuration</h2>
            <ModelSelector 
              tools={tools} 
              selectedTool={selectedTool} 
              setSelectedTool={setSelectedTool} 
            />
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Input Method</h2>
            <div className="space-y-4">
              <div className="relative bg-gray-100 rounded-lg p-1 flex flex-col sm:flex-row">
                <button
                  type="button"
                  onClick={() => setInputMode('text')}
                  className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all duration-200 ease-in-out ${
                    inputMode === 'text'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span className="hidden sm:inline">Text Input</span>
                  <span className="sm:hidden">Text</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('file')}
                  className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all duration-200 ease-in-out ${
                    inputMode === 'file'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span className="hidden sm:inline">File Input</span>
                  <span className="sm:hidden">File</span>
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Input Data</h2>
            <div className="transition-all duration-300 ease-in-out">
              {inputMode === 'file' ? (
                <FileInput />
              ) : (
                <TextInput 
                  input={input} 
                  setInput={setInput} 
                />
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <button
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium text-sm sm:text-base disabled:bg-gray-400 disabled:cursor-not-allowed"
              onClick={() =>
                callApi('/predict', 'POST', {
                  sentences: input.split('\n').filter(s => s.trim()),
                })
              }
              disabled={!input.trim()}
            >
              {loading ? 'Processing...' : 'Run Analysis'}
            </button>
          </div>
        </div>

        {/* RIGHT SIDE - Output Section */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Model Actions</h2>
            <ActionButtons callApi={callApi} />
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Analysis Results</h2>
            <ModelOutput loading={loading} result={result} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default InferencePage; 