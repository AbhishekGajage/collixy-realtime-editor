// src/components/editor/CodeEditor.jsx
// import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import './CodeEditor.css';

const CodeEditor = ({ language, code, onCodeChange, theme }) => {
  // eslint-disable-next-line no-undef
  const editorRef = useRef(null);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  const handleCodeChange = (value) => {
    onCodeChange(value || '');
  };

  return (
    <div className="code-editor-wrapper">
      <div className="editor-header">
        <span className="editor-title">Editor</span>
        <div className="editor-actions">
          <button className="action-btn" title="Format code">
            ✨ Format
          </button>
        </div>
      </div>
      <Editor
        height="100%"
        language={language}
        value={code}
        theme={theme === 'light' ? 'vs-light' : 'vs-dark'}
        onChange={handleCodeChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          wordWrap: 'on',
          automaticLayout: true,
          formatOnPaste: true,
          formatOnType: true,
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: 'on',
          tabSize: 2,
          insertSpaces: true,
        }}
      />
    </div>
  );
};

export default CodeEditor;