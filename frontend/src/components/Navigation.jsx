import './Navigation.css';

function Navigation({ activeTab, setActiveTab }) {
  const tabs = ['Inference', 'Performance', 'About'];
  
  return (
    <div className="nav-container">
      <h1 className="nav-title">Phenotype ID</h1>
      <div className="nav-tabs-wrapper">
        <div className="nav-tabs-container">
          {/* Left spacing - 10% */}
          <div className="nav-left-spacing"></div>
          
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`nav-tab ${activeTab === tab ? 'nav-tab-active' : 'nav-tab-inactive'}`}
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