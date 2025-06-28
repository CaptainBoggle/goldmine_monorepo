import './ActionButtons.css';

function ActionButtons({ callApi }) {
  return (
    <div className="action-buttons-container">
      <button 
        className="action-button action-button-status" 
        onClick={() => callApi('/status', 'GET')}
      >
        Status
      </button>
      <button 
        className="action-button action-button-info" 
        onClick={() => callApi('/info', 'GET')}
      >
        Info
      </button>
      <button 
        className="action-button action-button-load" 
        onClick={() => callApi('/load', 'POST')}
      >
        Load
      </button>
      <button 
        className="action-button action-button-unload" 
        onClick={() => callApi('/unload', 'POST')}
      >
        Unload
      </button>
    </div>
  );
}

export default ActionButtons; 