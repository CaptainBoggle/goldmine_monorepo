import './FileInput.css';

function FileInput() {
  return (
    <div className="file-input-container">
      <label className="file-input-label">File:</label>
      <div className="file-input-wrapper">
        <input
          className="file-input-field"
          placeholder="sample.json"
          disabled
        />
        <button className="file-input-button">+</button>
      </div>
    </div>
  );
}

export default FileInput; 