// src/components/auth/Signup.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import './Auth.css';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      localStorage.setItem('user', JSON.stringify({
        name: formData.name,
        email: formData.email,
        avatar: formData.name[0].toUpperCase()
      }));
      setLoading(false);
      navigate('/dashboard');
    }, 1000);
  };

  return (
    <AuthLayout>
      <button 
        className="google-btn"
        onClick={handleGoogleSignup}
        disabled={loading}
      >
        <span className="google-icon">G</span>
        Sign up with Google
      </button>

      <div className="divider">
        <span>Or</span>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Full Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter your full name"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
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
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Create a password"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm your password"
            required
            disabled={loading}
          />
        </div>

        <button 
          type="submit" 
          className="auth-submit-btn"
          disabled={loading}
        >
          {loading ? 'Creating account...' : 'Continue'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default Signup;