import './PerformancePage.css';

function PerformancePage() {
  return (
    <div className="performance-container">
      <h1 className="performance-title">Model Performance</h1>
      <div className="performance-section-list">
        <div className="performance-card">
          <h2 className="performance-section-title">Performance Metrics</h2>
          <p className="performance-section-text"></p>
        </div>
        <div className="performance-card">
          <h2 className="performance-section-title">Accuracy Statistics</h2>
          <div className="performance-metrics-grid">
          </div>
        </div>
        <div className="performance-card">
          <h2 className="performance-section-title">Model Validation</h2>
          <p className="performance-section-text"></p>
        </div>
        <div className="performance-card">
          <h2 className="performance-section-title">Testing Methodology</h2>
          <ul className="performance-checklist">
          </ul>
        </div>
      </div>
    </div>
  );
}

export default PerformancePage; 