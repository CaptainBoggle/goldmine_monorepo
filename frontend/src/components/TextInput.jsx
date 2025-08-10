import './TextInput.css';

function TextInput({ input, setInput }) {
  return (
    <div className="text-input-container">
      <label className="text-input-label">Text Input:</label>
      <textarea
        className="text-input-field"
        rows={3}
        value={input}
        onChange={e => setInput && setInput(e.target.value)}
      />
    </div>
  );
}

export default TextInput; 