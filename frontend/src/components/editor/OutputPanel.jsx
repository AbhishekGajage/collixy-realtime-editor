// src/components/editor/OutputPanel.jsx
import React, { useState } from 'react';
import './OutputPanel.css';

const OutputPanel = ({ output, onRunCode, onClearOutput, language }) => {
  const [terminalInput, setTerminalInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (terminalInput.trim()) {
      onRunCode(terminalInput);
      setTerminalInput('');
    }
  };

  return (
    <div className="output-panel">
      <div className="panel-header">
        <h3>Output</h3>
        <div className="panel-actions">
          <button className="action-btn" onClick={onClearOutput}>
            🗑️ Clear
          </button>
          <button className="action-btn run-btn" onClick={() => onRunCode()}>
            ▶ Run Code
          </button>
        </div>
      </div>
      
      <div className="output-content">
        <pre className="output-text">{output}</pre>
      </div>
      
      <div className="terminal-section">
        <div className="terminal-header">
          <span>Terminal</span>
          <span className="language-badge">{language}</span>
        </div>
        <form onSubmit={handleSubmit} className="terminal-form">
          <span className="prompt">$</span>
          <input
            type="text"
            value={terminalInput}
            onChange={(e) => setTerminalInput(e.target.value)}
            placeholder="Type command here..."
            className="terminal-input"
          />
          <button type="submit" className="send-btn">
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default OutputPanel;