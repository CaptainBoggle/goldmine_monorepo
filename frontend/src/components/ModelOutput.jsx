function ModelOutput({ loading, result }) {
  return (
    <div>
      <label className="block font-semibold mb-1">Model Output:</label>
      
      {loading && <div className="text-gray-500">loading...</div>}
      
      {result && (
        <div>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto whitespace-pre-wrap">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}

export default ModelOutput; 