function FileInput() {
  return (
    <div>
      <label className="block font-semibold mb-1">File:</label>
      <div className="flex gap-2">
        <input
          className="flex-1 border rounded px-4 py-2"
          placeholder="sample.json"
          disabled
        />
        <button className="px-3 py-2 rounded bg-black text-white text-lg">+</button>
      </div>
    </div>
  );
}

export default FileInput; 