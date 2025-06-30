import { useState, useRef } from 'react';
import './FileInput.css';

function FileInput({ onFileSelect }) {
  const [selectedFileName, setSelectedFileName] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check if file is TXT
      const allowedTypes = ['text/plain'];
      const fileExtension = file.name.split('.').pop().toLowerCase();
      
      if (allowedTypes.includes(file.type) || fileExtension === 'txt') {
        setSelectedFileName(file.name);
        
        // Read file content
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target.result;
          if (onFileSelect) {
            onFileSelect(content, file.name);
          }
        };
        reader.readAsText(file);
      } else {
        alert('Please select a TXT file.');
        setSelectedFileName('');
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleClearFile = () => {
    setSelectedFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onFileSelect) {
      onFileSelect('', '');
    }
  };

  return (
    <div className="file-input-container">
      <label className="file-input-label">File:</label>
      <div className="file-input-wrapper">
        <input
          className="file-input-field"
          placeholder="Select a TXT file"
          value={selectedFileName}
          readOnly
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,text/plain"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        {selectedFileName ? (
          <button 
            className="file-input-button file-input-button-clear" 
            onClick={handleClearFile}
            title="Clear file"
          >
            ×
          </button>
        ) : (
          <button 
            className="file-input-button" 
            onClick={handleButtonClick}
            title="Select file"
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}

export default FileInput; 