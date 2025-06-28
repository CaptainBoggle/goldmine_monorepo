import { useState } from 'react';
import { ModelSelector, FileInput, TextInput, ActionButtons, ModelOutput } from '../components';

function InferencePage({ tools, selectedTool, setSelectedTool, callApi, loading, result }) {
  const [input, setInput] = useState('Patient has fever and seizures');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
      {/* LEFT SIDE */}
      <div className="space-y-6">
        <ModelSelector 
          tools={tools} 
          selectedTool={selectedTool} 
          setSelectedTool={setSelectedTool} 
        />
        
        <FileInput />
        
        <TextInput 
          input={input} 
          setInput={setInput} 
        />
        
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
        <ActionButtons callApi={callApi} />
        
        <ModelOutput loading={loading} result={result} />
      </div>
    </div>
  );
}

export default InferencePage; 