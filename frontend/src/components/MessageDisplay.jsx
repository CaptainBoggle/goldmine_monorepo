import React from 'react';

function MessageDisplay({ error, success, onClearError, onClearSuccess }) {
  return (
    <>
      {error && (
        <div className="performance-message performance-message-error">
          <div className="flex justify-between items-start">
            <div className="flex-1">{error}</div>
            <button
              onClick={onClearError}
              className="ml-2 text-red-600 hover:text-red-800 text-sm font-medium"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {success && (
        <div className="performance-message performance-message-success">
          <div className="flex justify-between items-start">
            <div className="flex-1">{success}</div>
            <button
              onClick={onClearSuccess}
              className="ml-2 text-green-600 hover:text-green-800 text-sm font-medium"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default MessageDisplay; 