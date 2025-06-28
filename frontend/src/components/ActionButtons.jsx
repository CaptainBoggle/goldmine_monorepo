function ActionButtons({ callApi }) {
  return (
    <div className="flex flex-wrap gap-3">
      <button className="px-4 py-2 border rounded" onClick={() => callApi('/status')}>
        Status
      </button>
      <button className="px-4 py-2 border rounded" onClick={() => callApi('/info')}>
        Info
      </button>
      <button className="px-4 py-2 border rounded" onClick={() => callApi('/load', 'POST')}>
        Load
      </button>
      <button
        className="px-4 py-2 border rounded"
        onClick={() => callApi('/unload', 'POST')}
      >
        Unload
      </button>
    </div>
  );
}

export default ActionButtons; 