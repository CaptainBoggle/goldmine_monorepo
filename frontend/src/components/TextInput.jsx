function TextInput({ input, setInput }) {
  return (
    <div>
      <label className="block font-semibold mb-1">Text Input:</label>
      <textarea
        className="w-full border rounded px-4 py-2"
        rows={3}
        value={input}
        onChange={e => setInput(e.target.value)}
      />
    </div>
  );
}

export default TextInput; 