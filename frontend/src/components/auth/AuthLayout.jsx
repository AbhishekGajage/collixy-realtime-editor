// src/components/auth/AuthLayout.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './AuthLayout.css';

const AuthLayout = ({ children }) => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="auth-layout">
      <div className="auth-container">
        <div className="auth-header">
          <Link to="/" className="auth-logo">
            COLLIXY
            <span>CODE TOGETHER</span>
          </Link>
        </div>
        
        <div className="auth-card">
          <div className="auth-header-text">
            <h2>{isLoginPage ? 'Log in' : 'Sign up'}</h2>
            <p className="auth-subtitle">You can collaborate code with friends</p>
          </div>
          
          {children}
          
          <div className="auth-switch">
            <p>
              {isLoginPage ? "Don't have an account?" : "Already have an account?"}
              <Link to={isLoginPage ? "/signup" : "/login"} className="switch-link">
                {isLoginPage ? ' Sign up' : ' Log in'}
              </Link>
            </p>
          </div>
        </div>
        
        <div className="auth-footer">
          <p>© Collixy 2025. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;