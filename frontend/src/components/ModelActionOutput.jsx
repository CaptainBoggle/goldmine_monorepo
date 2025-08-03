import React from 'react';
import './ModelActionOutput.css';

function ModelActionOutput({ result, loading }) {
  if (loading) {
    return (
      <div className="model-action-output-container">
        <div className="model-action-output-loading">Loading...</div>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  // Parse the result
  let parsedResult;
  try {
    parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
  } catch (e) {
    // If parsing fails, show the raw result
    return (
      <div className="model-action-output-container">
        <pre className="model-action-output-raw">{result}</pre>
      </div>
    );
  }

  // Determine the action type based on the response structure
  let actionType = 'unknown';
  if (parsedResult.state !== undefined) {
    actionType = 'status';
  } else if (parsedResult.name !== undefined) {
    actionType = 'info';
  } else if (parsedResult.loading_time !== undefined) {
    actionType = 'load';
  }

  const renderStatus = () => (
    <div className="model-action-output-status">
      <div className="status-indicator">
        <span className={`status-dot status-${parsedResult.state}`}></span>
        <span className="status-text">
          Model is <strong>{parsedResult.state}</strong>
        </span>
      </div>
      {parsedResult.message && (
        <div className="status-message">{parsedResult.message}</div>
      )}
    </div>
  );

  const renderInfo = () => (
    <div className="model-action-output-info">
      <div className="info-header">
        <h3 className="info-name">{parsedResult.name}</h3>
        <span className="info-version">v{parsedResult.version}</span>
      </div>
      <div className="info-description">{parsedResult.description}</div>
      <div className="info-author">by {parsedResult.author}</div>
    </div>
  );

  const renderLoad = () => (
    <div className="model-action-output-load">
      <div className="load-status">
        <span className={`status-dot status-${parsedResult.state}`}></span>
        <span className="load-text">
          Model is <strong>{parsedResult.state}</strong>
        </span>
      </div>
      {parsedResult.loading_time !== undefined && (
        <div className="load-time">
          Loading time: <strong>{parsedResult.loading_time.toFixed(1)}s</strong>
        </div>
      )}
      {parsedResult.message && (
        <div className="load-message">{parsedResult.message}</div>
      )}
    </div>
  );

  const renderUnload = () => (
    <div className="model-action-output-unload">
      <div className="unload-status">
        <span className="status-dot status-unloaded"></span>
        <span className="unload-text">
          Model has been <strong>unloaded</strong>
        </span>
      </div>
      {parsedResult.message && (
        <div className="unload-message">{parsedResult.message}</div>
      )}
    </div>
  );

  const renderUnknown = () => (
    <div className="model-action-output-unknown">
      <pre className="model-action-output-raw">{JSON.stringify(parsedResult, null, 2)}</pre>
    </div>
  );

  return (
    <div className="model-action-output-container">
      {actionType === 'status' && renderStatus()}
      {actionType === 'info' && renderInfo()}
      {actionType === 'load' && renderLoad()}
      {actionType === 'unload' && renderUnload()}
      {actionType === 'unknown' && renderUnknown()}
    </div>
  );
}

export default ModelActionOutput; 