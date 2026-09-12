// frontend/src/pages/RegisterPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register, getGoogleAuthUrl } from '../services/api';
import { storeRegistrationData } from '../utils/storage';

const RegisterPage = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Hide scrollbar but keep scrolling functionality
  useEffect(() => {
    // Add custom CSS to hide scrollbar but keep scrolling
    const style = document.createElement('style');
    style.textContent = `
      body.register-page-active {
        overflow-y: scroll !important;
        padding-right: 0 !important;
        position: fixed;
        width: 100%;
        height: 100%;
      }
      
      body.register-page-active::-webkit-scrollbar {
        width: 0px;
        background: transparent;
      }
      
      body.register-page-active {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      
      /* Custom scrollbar for the modal */
      .modal-scroll::-webkit-scrollbar {
        width: 8px;
      }
      
      .modal-scroll::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
      }
      
      .modal-scroll::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 4px;
      }
      
      .modal-scroll::-webkit-scrollbar-thumb:hover {
        background: #555;
      }
      
      .dark .modal-scroll::-webkit-scrollbar-track {
        background: #374151;
      }
      
      .dark .modal-scroll::-webkit-scrollbar-thumb {
        background: #6b7280;
      }
      
      .dark .modal-scroll::-webkit-scrollbar-thumb:hover {
        background: #4b5563;
      }
    `;
    document.head.appendChild(style);
    
    // Add class to body
    document.body.classList.add('register-page-active');
    
    return () => {
      // Cleanup
      document.body.classList.remove('register-page-active');
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        navigate('/login');
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    if (serverError) {
      setServerError('');
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (formData.username.length > 30) {
      newErrors.username = 'Username must be at most 30 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Password strength indicator
  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500', 'bg-green-600'];
    
    return {
      strength: strength,
      label: labels[strength - 1] || '',
      color: colors[strength - 1] || ''
    };
  };

  const passwordStrength = getPasswordStrength(formData.password);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccessMessage('');
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await register({
        username: formData.username,
        email: formData.email,
        password: formData.password
      });
      
      if (response.success) {
        storeRegistrationData(formData.email, formData.username);
        
        setSuccessMessage('Registration successful! Redirecting to login...');
        
        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
        
        setErrors({});
        
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              registeredEmail: formData.email,
              registeredUsername: formData.username
            }
          });
        }, 1500);
      } else {
        setServerError(response.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.response?.data?.message) {
        setServerError(error.response.data.message);
      } else if (error.response?.data?.errors) {
        const backendErrors = error.response.data.errors;
        if (Array.isArray(backendErrors)) {
          const errorMessages = backendErrors.map(err => err.msg).join(', ');
          setServerError(errorMessages);
        }
      } else if (error.message) {
        setServerError(error.message);
      } else {
        setServerError('An error occurred during registration. Please try again.');
      }
      
      if (error.code === 'ERR_NETWORK') {
        setServerError('Cannot connect to server. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleSignUp = async () => {
    try {
      setLoading(true);
      setServerError('');
      const response = await getGoogleAuthUrl();
      if (response.success && response.url) {
        window.location.href = response.url;
      } else {
        setServerError('Failed to get Google authentication URL');
      }
    } catch (error) {
      console.error('Google signup error:', error);
      setServerError('Failed to initiate Google signup. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      {/* Modal Overlay with blur effect */}
      <div className="fixed inset-0 z-9999 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
        {/* Modal Content - Allow scrolling within modal if needed */}
        <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md my-auto animate-slideIn max-h-[90vh] overflow-y-auto modal-scroll">
          {/* Close button */}
          <button
            onClick={() => navigate('/login')}
            className="cursor-pointer absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 z-10 p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Signup Form */}
          <div className="p-6">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="bg-linear-to-r from-blue-600 to-purple-600 p-4 rounded-t-2xl -mx-6 -mt-6 mb-6">
                <h1 className="text-2xl font-bold text-white mb-2">Create Account</h1>
                <p className="text-blue-100">Join thousands of developers already coding together</p>
              </div>
            </div>
            
            {successMessage && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {successMessage}
              </div>
            )}
            
            {serverError && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {serverError}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              {/* Username Field */}
              <div className="mb-6">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    value={formData.username}
                    onChange={handleChange}
                    disabled={loading}
                    className={`block w-full pl-10 pr-4 py-3 border ${
                      errors.username ? 'border-red-300' : 'border-gray-300 dark:border-gray-700'
                    } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors dark:bg-gray-800 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed`}
                    placeholder="johndoe"
                  />
                </div>
                {errors.username && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {errors.username}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Only letters, numbers, and underscores. 3-30 characters.
                </p>
              </div>
              
              {/* Email Field */}
              <div className="mb-6">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                    className={`block w-full pl-10 pr-4 py-3 border ${
                      errors.email ? 'border-red-300' : 'border-gray-300 dark:border-gray-700'
                    } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors dark:bg-gray-800 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed`}
                    placeholder="you@example.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {errors.email}
                  </p>
                )}
              </div>
              
              {/* Password Field */}
              <div className="mb-6">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                    className={`block w-full pl-10 pr-4 py-3 border ${
                      errors.password ? 'border-red-300' : 'border-gray-300 dark:border-gray-700'
                    } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors dark:bg-gray-800 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed`}
                    placeholder="••••••••"
                  />
                </div>
                
                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="mt-3">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Password Strength:</span>
                      <span className={`text-sm font-medium ${passwordStrength.color.replace('bg-', 'text-')}`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${passwordStrength.color} transition-all duration-300`}
                        style={{ width: `${(passwordStrength.strength / 6) * 100}%` }}
                      />
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${formData.password.length >= 6 ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                        <span className="text-xs text-gray-600 dark:text-gray-400">6+ characters</span>
                      </div>
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${/[a-z]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                        <span className="text-xs text-gray-600 dark:text-gray-400">Lowercase</span>
                      </div>
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${/[A-Z]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                        <span className="text-xs text-gray-600 dark:text-gray-400">Uppercase</span>
                      </div>
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${/[0-9]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                        <span className="text-xs text-gray-600 dark:text-gray-400">Number</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {errors.password && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {errors.password}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  At least 6 characters
                </p>
              </div>
              
              {/* Confirm Password Field */}
              <div className="mb-6">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={loading}
                    className={`block w-full pl-10 pr-4 py-3 border ${
                      errors.confirmPassword ? 'border-red-300' : 'border-gray-300 dark:border-gray-700'
                    } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors dark:bg-gray-800 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed`}
                    placeholder="••••••••"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
              
              {/* Terms and Conditions */}
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="cursor-pointer h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-700 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    I agree to the{' '}
                    <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                      Privacy Policy
                    </a>
                  </span>
                </label>
              </div>
              
              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="cursor-pointer w-full bg-linear-to-r from-blue-600 to-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
            
            {/* Already have an account */}
            <div className="mt-8 text-center">
              <p className="text-gray-600 dark:text-gray-400 cursor-pointer ">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                >
                  Sign In
                </Link>
              </p>
            </div>
            
            {/* Divider */}
            <div className="mt-8 flex items-center">
              <div className="flex-1 border-t border-gray-300 dark:border-gray-700"></div>
              <div className="px-4 text-gray-500 dark:text-gray-400 text-sm">Or continue with</div>
              <div className="flex-1 border-t border-gray-300 dark:border-gray-700"></div>
            </div>
            
            {/* Google Sign In */}
            <div className="mt-6">
              <button
                onClick={handleGoogleSignUp}
                disabled={loading}
                className="cursor-pointer w-full flex justify-center items-center py-2.5 px-4 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign up with Google
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RegisterPage;