import './ModelOutput.css';

function ModelOutput({ loading, result }) {
  return (
    <div className="model-output-container">
      <label className="model-output-label">Model Output:</label>
      
      {loading && <div className="model-output-loading">loading...</div>}
      
      {result && (
        <div>
          <pre className="model-output-result">{result}</pre>
        </div>
      )}
    </div>
  );
}

export default ModelOutput; 