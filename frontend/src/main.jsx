// frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
// import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { UserProvider } from './Context/userContext'; // NOT from hooks folder
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
      <UserProvider>
        <App />
      </UserProvider>
  </React.StrictMode>
);