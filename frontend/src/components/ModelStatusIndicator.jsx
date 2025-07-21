import React from 'react';

function ModelStatusIndicator({ modelStatus, selectedTool, onReloadModel, isOperationRunning }) {
  if (!modelStatus) return null;

  const getStatusColor = (status) => {
    if (status.includes('ready') || status.includes('loaded')) {
      return 'bg-green-100 text-green-800';
    } else if (status.includes('failed')) {
      return 'bg-red-100 text-red-800';
    } else {
      return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="mb-4 flex items-center justify-between">
      <div className={`px-3 py-2 rounded-md text-sm font-medium ${getStatusColor(modelStatus)}`}>
        {modelStatus}
      </div>
      {selectedTool && (
        <button
          onClick={onReloadModel}
          disabled={modelStatus.includes('Loading') || isOperationRunning}
          className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
        >
          {modelStatus.includes('Loading') ? 'Loading...' : 'Reload Model'}
        </button>
      )}
    </div>
  );
}

export default ModelStatusIndicator; 