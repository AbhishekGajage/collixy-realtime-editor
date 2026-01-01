// src/components/common/Navbar.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const [theme, setTheme] = useState('light');
  const [user] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const navigate = useNavigate();

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <div className="logo">
            <h1>COLLIXY</h1>
            <span>CODE TOGETHER</span>
          </div>
        </Link>

        <div className="navbar-menu">
          <Link to="/about" className="nav-link">About us</Link>
          
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {user ? (
            <div className="user-dropdown">
              <button className="user-btn">
                <span className="user-avatar">{user.avatar}</span>
                <span className="user-name">{user.name}</span>
              </button>
              <div className="dropdown-menu">
                <button className="dropdown-item" onClick={() => navigate('/dashboard')}>
                  Dashboard
                </button>
                <button className="dropdown-item" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <>
              <button className="nav-btn" onClick={() => navigate('/login')}>
                Login
              </button>
              <button 
                className="get-started-btn"
                onClick={() => navigate('/login')}
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;