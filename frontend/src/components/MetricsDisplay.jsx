import React from 'react';

function MetricsDisplay({ metrics, dataSource }) {
  if (!metrics) return null;

  const formatMetricValue = (value) => {
    return value ? (value * 100).toFixed(2) + '%' : 'N/A';
  };

  return (
    <div className="performance-card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="performance-section-title">Performance Metrics</h2>
        {dataSource && (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            dataSource === 'cached' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-green-100 text-green-800'
          }`}>
            {dataSource === 'cached' ? 'Cached Data' : 'Fresh Data'}
          </span>
        )}
      </div>
      <div className="performance-metrics-grid">
        <div className="performance-metric performance-metric-accuracy">
          <div className="performance-metric-value text-blue-600">
            {formatMetricValue(metrics.accuracy)}
          </div>
          <div className="performance-metric-label">Accuracy</div>
        </div>
        <div className="performance-metric performance-metric-precision">
          <div className="performance-metric-value text-green-600">
            {formatMetricValue(metrics.precision)}
          </div>
          <div className="performance-metric-label">Precision</div>
        </div>
        <div className="performance-metric performance-metric-recall">
          <div className="performance-metric-value text-purple-600">
            {formatMetricValue(metrics.recall)}
          </div>
          <div className="performance-metric-label">Recall</div>
        </div>
        <div className="performance-metric performance-metric-f1">
          <div className="performance-metric-value text-orange-600">
            {formatMetricValue(metrics.f1)}
          </div>
          <div className="performance-metric-label">F1 Score</div>
        </div>
        <div className="performance-metric performance-metric-jaccard">
          <div className="performance-metric-value text-violet-600">
            {formatMetricValue(metrics.jaccard)}
          </div>
          <div className="performance-metric-label">Jaccard</div>
        </div>
      </div>
    </div>
  );
}

export default MetricsDisplay; 