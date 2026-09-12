// src/pages/LoginPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { useTheme } from '../Context/useTheme';
import { useUser } from '../Context/userContext';
import {
  GoogleButton,
  Divider,
  FormInput,
  SubmitButton,
} from '../components/auth/AuthComponents';
import { authAPI, testBackendConnection } from '../services/api';
import { getRegistrationData, clearRegistrationData } from '../utils/storage';

const LoginPage = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useUser();
  
  // Get recent registration data from localStorage
  const recentRegistration = getRegistrationData();
  
  // Initialize with empty values - will be populated in useEffect
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [connectionTestResult, setConnectionTestResult] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // SINGLE useEffect that handles ALL initialization
  useEffect(() => {
    console.log('🔍 LoginPage initialization effect running');
    
    let mounted = true;
    
    const initializePage = async () => {
      // 1. Handle URL query parameters (errors)
      const params = new URLSearchParams(location.search);
      const error = params.get('error');
      const message = params.get('message');
      
      if (error && mounted) {
        let errorMessage = 'Authentication failed. Please try again.';
        
        switch (error) {
          case 'no_code':
            errorMessage = 'No authentication code received from Google.';
            break;
          case 'google_auth_failed':
            errorMessage = message || 'Google authentication failed. Please try again.';
            break;
          case 'no_token':
            errorMessage = 'No authentication token received.';
            break;
          case 'callback_failed':
            errorMessage = 'Authentication callback failed.';
            break;
          case 'server_config':
            errorMessage = 'Server configuration error. Contact administrator.';
            break;
          default:
            errorMessage = error;
        }
        
        setErrors({ general: errorMessage });
        
        // Clear error from URL without causing re-render
        if (window.location.search) {
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
        }
      }
      
      // 2. Handle location state (registration success)
      if (location.state?.registeredEmail && mounted) {
        console.log('📧 Setting email from registration redirect:', location.state.registeredEmail);
        setFormData(prev => ({
          ...prev,
          email: location.state.registeredEmail
        }));
        setSuccessMessage('Registration successful! Please login with your credentials.');
        if (location.state?.isNewUser) {
          localStorage.setItem('isNewUser', 'true');
          console.log('✅ Set isNewUser flag from registration redirect');
        }
        // Clear location state, but keep `from` so a shared invite link survives
        navigate(location.pathname, {
          replace: true,
          state: location.state?.from ? { from: location.state.from } : {},
        });
      }
      // 3. Handle localStorage registration data
      else if (recentRegistration && mounted) {
        console.log('📧 Setting email from localStorage:', recentRegistration.email);
        setFormData(prev => ({
          ...prev,
          email: recentRegistration.email
        }));
        setSuccessMessage('Welcome back! Please login to continue.');
        
        // Clear the stored data after delay
        setTimeout(() => {
          if (mounted) {
            clearRegistrationData();
            setSuccessMessage('');
          }
        }, 3000);
      }
      
      // 4. Check backend connection
      try {
        console.log('🔍 Checking backend connection...');
        const result = await testBackendConnection();
        
        if (!mounted) return;
        
        setConnectionTestResult(result);
        
        if (result.success) {
          setBackendStatus('connected');
          console.log('✅ Backend connected successfully:', result.endpoint);
          
          // Optional: Check Google OAuth configuration
          try {
            const debugRes = await authAPI.getGoogleDebug();
            console.log('🔧 Google OAuth config check:', debugRes.data?.configured ? 'Configured' : 'Not configured');
          } catch (debugError) {
            console.warn('⚠️ Could not fetch Google debug info:', debugError.message);
          }
        } else {
          setBackendStatus('disconnected');
          console.error('❌ Backend connection failed:', result.message);
          setErrors({ 
            general: result.message || 'Cannot connect to server. Make sure backend is running at http://localhost:5001' 
          });
        }
      } catch (error) {
        if (!mounted) return;
        
        console.error('❌ Connection check error:', error);
        setBackendStatus('disconnected');
        setErrors({ 
          general: 'Cannot connect to server. Make sure backend is running at http://localhost:5001' 
        });
      }
    };
    
    initializePage();
    
    // Cleanup function
    return () => {
      mounted = false;
    };
  }, []);

  // Handler functions with useCallback to prevent unnecessary re-renders
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear field error when user types
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
    
    // Clear general errors and success messages when user types
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: '' }));
    }
    if (successMessage) {
      setSuccessMessage('');
    }
  }, [errors, successMessage]);

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    return newErrors;
  }, [formData.email, formData.password]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});
    setSuccessMessage('');

    try {
      console.log('🔐 Attempting email login...');
      const res = await authAPI.login(formData.email, formData.password);

      if (res.data.success) {
        console.log('✅ Email login successful');
        localStorage.setItem("accessToken", res.data.token);
        localStorage.setItem("isNewUser", res.data.isNewUser ? "true" : "false");
        setUser(res.data.user);
        
        // Clear any stored registration data
        clearRegistrationData();

        // Return the user to wherever they were headed before ProtectedRoute
        // intercepted them (e.g. a shared /room/:roomId invite), else dashboard.
        navigate(location.state?.from || "/dashboard", { replace: true });
      } else {
        setErrors({ general: res.data.message || "Login failed" });
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      
      let errorMessage = "Login failed. Please try again.";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 401) {
        errorMessage = "Invalid email or password";
      } else if (error.response?.status === 404) {
        errorMessage = "User not found. Please check your email";
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = "Cannot connect to server. Please check your connection";
      }
      
      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, [formData, validateForm, setUser, navigate, location.state?.from]);

  const handleGoogleLogin = useCallback(async () => {
    if (backendStatus === 'disconnected') {
      setErrors({ 
        general: 'Cannot connect to server. Make sure backend is running at http://localhost:5001' 
      });
      return;
    }
    
    setIsGoogleLoading(true);
    setErrors({});
    setSuccessMessage('');
    
    try {
      console.log('🔗 Requesting Google OAuth URL...');
      
      // Get Google OAuth URL
      const response = await authAPI.getGoogleAuthUrl();
      
      console.log('✅ Received Google URL response:', response.data);
      
      if (response.data.success && response.data.url) {
        console.log('🌐 Redirecting to Google OAuth...');
        window.location.href = response.data.url;
      } else {
        setErrors({ 
          general: response.data.message || 'Failed to get Google login URL' 
        });
      }
    } catch (error) {
      console.error('❌ Google login error:', error);
      
      let errorMessage = 'Failed to start Google authentication. ';
      
      if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
        errorMessage = 'Cannot connect to server. Please check:';
        errorMessage += '\n1. Backend is running at http://localhost:5001';
        errorMessage += '\n2. CORS is properly configured';
        errorMessage += '\n3. No firewall blocking port 5001';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error: ' + (error.response.data?.message || 'Check backend logs');
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      setErrors({ general: errorMessage });
    } finally {
      setIsGoogleLoading(false);
    }
  }, [backendStatus]);

  const retryConnection = useCallback(async () => {
    setBackendStatus('checking');
    setErrors({});
    setSuccessMessage('');
    setConnectionTestResult(null);
    
    try {
      const result = await testBackendConnection();
      setConnectionTestResult(result);
      
      if (result.success) {
        setBackendStatus('connected');
      } else {
        setBackendStatus('disconnected');
        setErrors({ general: result.message });
      }
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      setBackendStatus('disconnected');
      setErrors({ 
        general: 'Cannot connect to server. Make sure backend is running at http://localhost:5001' 
      });
    }
  }, []);

  // Handle escape key to go back to home
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        navigate('/');
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [navigate]);

  // Hide scrollbar but keep scrolling
  useEffect(() => {
    // Add custom CSS to hide scrollbar but keep scrolling
    const style = document.createElement('style');
    style.textContent = `
      body.login-page-active {
        overflow-y: scroll !important;
        padding-right: 0 !important;
        position: fixed;
        width: 100%;
        height: 100%;
      }
      
      body.login-page-active::-webkit-scrollbar {
        width: 0px;
        background: transparent;
      }
      
      body.login-page-active {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
    `;
    document.head.appendChild(style);
    
    // Add class to body
    document.body.classList.add('login-page-active');
    
    return () => {
      // Cleanup
      document.body.classList.remove('login-page-active');
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);

  const handleClose = () => {
    navigate('/');
  };

  return (
    <>
      {/* Full page overlay with backdrop blur */}
      <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${
        theme === 'dark' ? 'bg-black/70' : 'bg-black/60'
      } backdrop-blur-md`}>
        
        {/* Backdrop click handler */}
        <div 
          className="absolute inset-0 cursor-pointer"
          onClick={handleClose}
        />
        
        {/* Modal Content */}
        <div className="relative z-10000 w-full max-w-md animate-[fadeIn_0.3s_ease-out]">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
            {/* Close button */}
            <button
              onClick={handleClose}
              className="cursor-pointer absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 z-10 p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Login Form */}
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-t-2xl -mx-6 -mt-6 mb-6">
                  <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
                  <p className="text-blue-100">Sign in to your account</p>
                </div>
              </div>
              
              {/* Success Message */}
              {successMessage && (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {successMessage}
                </div>
              )}
              
              {/* Connection status indicator */}
              <div className="mb-6">
                {backendStatus === 'checking' && (
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                    Checking server connection...
                  </div>
                )}
                
                {backendStatus === 'connected' && connectionTestResult && (
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Server connected
                  </div>
                )}
                
                {backendStatus === 'disconnected' && (
                  <div className="inline-flex flex-col items-center">
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800 mb-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                      Server disconnected
                    </div>
                    <button
                      onClick={retryConnection}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Retry connection
                    </button>
                  </div>
                )}
              </div>
              
              {backendStatus === 'connected' && (
                <>
                  <GoogleButton 
                    onClick={handleGoogleLogin} 
                    loading={isGoogleLoading}
                    disabled={isGoogleLoading}
                    className="w-full"
                  />
                  
                  <Divider text="or continue with email" />
                </>
              )}
              
              {errors.general && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {errors.general}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <FormInput
                  label="Email Address"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  error={errors.email}
                  disabled={isLoading || backendStatus === 'disconnected'}
                  className="w-full"
                />
                
                <FormInput
                  label="Password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  error={errors.password}
                  disabled={isLoading || backendStatus === 'disconnected'}
                  className="w-full"
                />
                
                <div className="flex justify-between items-center mb-4">
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2 rounded" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Remember me
                    </span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                
                <SubmitButton 
                  disabled={isLoading || backendStatus === 'disconnected'} 
                  loading={isLoading}
                  className="w-full"
                >
                  {backendStatus === 'disconnected' ? 'Server Offline' : 'Sign In'}
                </SubmitButton>
              </form>
              
              <div className="mt-6 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  Don't have an account?{' '}
                  <Link
                    to="/register"
                    className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;