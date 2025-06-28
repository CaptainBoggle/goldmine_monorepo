function ActionButtons({ callApi }) {
  return (
    <div className="flex flex-wrap gap-3">
      <button 
        className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-300 ease-in-out transform hover:scale-105" 
        onClick={() => callApi('/status', 'GET')}
      >
        Status
      </button>
      <button 
        className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-all duration-300 ease-in-out transform hover:scale-105" 
        onClick={() => callApi('/info', 'GET')}
      >
        Info
      </button>
      <button 
        className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all duration-300 ease-in-out transform hover:scale-105" 
        onClick={() => callApi('/load', 'POST')}
      >
        Load
      </button>
      <button 
        className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 transition-all duration-300 ease-in-out transform hover:scale-105" 
        onClick={() => callApi('/unload', 'POST')}
      >
        Unload
      </button>
    </div>
  );
}

export default ActionButtons; 