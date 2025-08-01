import './Navigation.css';
import { useLoading } from '../contexts/LoadingContext';

function Navigation({ activeTab, setActiveTab }) {
  const tabs = ['Inference', 'Performance', 'Evaluation', 'About'];
  const { isGlobalLoading } = useLoading();
  
  return (
    <div className="nav-container">
      <h1 className="nav-title">Goldmine</h1>
      <div className="nav-tabs-wrapper">
        <div className="nav-tabs-container">
          {/* Left spacing - 10% */}
          <div className="nav-left-spacing"></div>
          
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              disabled={isGlobalLoading}
              className={`nav-tab ${activeTab === tab ? 'nav-tab-active' : 'nav-tab-inactive'} ${isGlobalLoading ? 'nav-tab-disabled' : ''}`}
            >
              {tab}
            </button>
          ))}
          
          {/* Right spacing - 10% */}
          <div className="nav-right-spacing"></div>
        </div>
      </div>
    </div>
  );
}

export default Navigation; 