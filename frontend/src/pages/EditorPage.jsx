// src/pages/EditorPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CodeEditor from '../components/editor/CodeEditor';
import OutputPanel from '../components/editor/OutputPanel';
import UserList from '../components/editor/UserList';
import './EditorPage.css';

const EditorPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(`// Welcome to Collixy Editor!
// Start coding with your team...

console.log("Hello, Collixy!");

function greetTeam() {
  const team = ["Alex", "Maria", "Sam", "Taylor"];
  return team.map(member => \`Hello \${member}!\`);
}

console.log(greetTeam());`);
  
  const [output, setOutput] = useState('');
  const [user] = useState(() => {
    return JSON.parse(localStorage.getItem('user'));
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleRunCode = (input = '') => {
    setOutput(prev => `${prev}\n$ Executing code...\n`);
    
    setTimeout(() => {
      let result = '';
      if (input) {
        result = `$ ${input}\n> Command executed successfully\n`;
      } else {
        result = `> Code executed successfully!\n> Output from ${user?.name || 'User'}\n> Room: ${roomId}\n`;
        // Simulate different outputs based on language
        switch(language) {
          case 'javascript':
            result += '> console.log("Hello World!");\n> Hello World!\n';
            break;
          case 'python':
            result += '> print("Hello World!")\n> Hello World!\n';
            break;
          case 'java':
            result += '> System.out.println("Hello World!");\n> Hello World!\n';
            break;
          default:
            result += '> Output generated\n';
        }
      }
      setOutput(prev => prev + result);
    }, 500);
  };

  const handleClearOutput = () => {
    setOutput('');
  };

  const languages = [
    { value: 'javascript', label: 'JavaScript', icon: 'JS' },
    { value: 'python', label: 'Python', icon: 'Py' },
    { value: 'java', label: 'Java', icon: 'Java' },
    { value: 'cpp', label: 'C++', icon: 'C++' },
    { value: 'typescript', label: 'TypeScript', icon: 'TS' },
    { value: 'html', label: 'HTML', icon: 'HTML' },
    { value: 'css', label: 'CSS', icon: 'CSS' }
  ];

  return (
    <div className="editor-page">
      <header className="editor-header">
        <div className="header-left">
          <button 
            className="home-btn"
            onClick={() => navigate('/dashboard')}
          >
            🏠 Home
          </button>
          <div className="header-title">
            <h2>Collixy Editor</h2>
            <span className="room-id-badge">Room: {roomId}</span>
          </div>
        </div>

        <div className="header-center">
          <select 
            className="language-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {languages.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
          <button className="header-btn">
            💾 Save
          </button>
          <button className="header-btn">
            📋 Share
          </button>
        </div>

        <div className="header-right">
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
          <div className="user-menu">
            <div className="user-avatar-small">{user?.avatar}</div>
            <span className="user-name">{user?.name}</span>
          </div>
        </div>
      </header>

      <div className="editor-container">
        <div className="editor-left">
          <UserList roomId={roomId} />
        </div>

        <div className="editor-center">
          <CodeEditor
            language={language}
            code={code}
            onCodeChange={setCode}
            theme={theme}
          />
        </div>

        <div className="editor-right">
          <OutputPanel
            output={output}
            onRunCode={handleRunCode}
            onClearOutput={handleClearOutput}
            language={language}
          />
        </div>
      </div>
    </div>
  );
};

export default EditorPage;