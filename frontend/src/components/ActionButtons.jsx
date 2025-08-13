import './ActionButtons.css';

function ActionButtons({ callApi }) {
  const handleClick = (endpoint, method) => {
    if (callApi && typeof callApi === 'function') {
      callApi(endpoint, method);
    }
  };

  return (
    <div className="action-buttons-container">
      <button 
        className="action-button action-button-status" 
        onClick={() => handleClick('/status', 'GET')}
      >
        Status
      </button>
      <button 
        className="action-button action-button-info" 
        onClick={() => handleClick('/info', 'GET')}
      >
        Info
      </button>
      <button 
        className="action-button action-button-load" 
        onClick={() => handleClick('/load', 'POST')}
      >
        Load
      </button>
      <button 
        className="action-button action-button-unload" 
        onClick={() => handleClick('/unload', 'POST')}
      >
        Unload
      </button>
    </div>
  );
}

export default ActionButtons; 