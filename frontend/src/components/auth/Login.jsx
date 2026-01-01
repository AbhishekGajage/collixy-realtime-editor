// src/components/auth/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setLoading(true);
    // Simulate Google login
    setTimeout(() => {
      localStorage.setItem('user', JSON.stringify({
        name: 'Google User',
        email: 'user@example.com',
        avatar: 'G'
      }));
      setLoading(false);
      navigate('/dashboard');
    }, 1000);
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      localStorage.setItem('user', JSON.stringify({
        name: email.split('@')[0],
        email: email,
        avatar: email[0].toUpperCase()
      }));
      setLoading(false);
      navigate('/dashboard');
    }, 1000);
  };

  return (
    <AuthLayout>
      <button 
        className="google-btn"
        onClick={handleGoogleLogin}
        disabled={loading}
      >
        <span className="google-icon">G</span>
        Sign in with Google
      </button>

      <div className="divider">
        <span>Or</span>
      </div>

      <form className="auth-form" onSubmit={handleEmailLogin}>
        <div className="form-group">
          <label htmlFor="email">Email address</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            disabled={loading}
          />
        </div>

        <button 
          type="submit" 
          className="auth-submit-btn"
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Continue'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default Login;