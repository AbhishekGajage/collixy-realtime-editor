// frontend/src/pages/RegisterPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register, getGoogleAuthUrl } from '../services/api';
import { storeRegistrationData } from '../utils/storage';
import { useTheme } from '../Context/useTheme';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors((prev) => ({
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
      newErrors.username = 'Must be at least 3 characters';
    } else if (formData.username.length > 30) {
      newErrors.username = 'Must be at most 30 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Only letters, numbers, and underscores';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!agreedToTerms) {
      newErrors.terms = 'Please accept the Terms & Privacy Policy';
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
      label: labels[strength - 1] || 'Weak',
      color: colors[strength - 1] || 'bg-red-500'
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
          const errorMessages = backendErrors.map((err) => err.msg).join(', ');
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
      setGoogleLoading(true);
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
      setGoogleLoading(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 md:p-6 ${
        theme === 'dark' ? 'bg-black/75' : 'bg-black/60'
      } backdrop-blur-md overflow-y-auto`}
    >
      {/* Backdrop click handler */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={() => navigate('/login')}
        aria-label="Close modal overlay"
      />

      {/* Landscape Modal Card */}
      <div className="relative z-10 w-full max-w-4xl lg:max-w-5xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-200/80 dark:border-gray-800 transition-all my-auto">
        {/* Floating Close Button */}
        <button
          onClick={() => navigate('/login')}
          className="cursor-pointer absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-20 p-2 text-gray-400 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white bg-white/80 dark:bg-gray-850/80 backdrop-blur-md rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750 transition-all shadow-sm"
          title="Close (Esc)"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 2-Column Landscape Split */}
        <div className="flex flex-col md:flex-row min-h-[520px]">
          {/* LEFT PANEL: Brand Showcase Hero (50% Equal Width) */}
          <div className="md:w-1/2 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute -top-16 -left-16 w-52 h-52 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 w-52 h-52 bg-purple-400/20 rounded-full blur-2xl pointer-events-none" />

            {/* Top Brand Identity */}
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <div>
                  <span className="text-xl font-bold tracking-tight text-white block">Collixy</span>
                  <span className="text-[11px] font-medium text-blue-200 uppercase tracking-wider">
                    Collaborative IDE
                  </span>
                </div>
              </div>

              <h2 className="text-2xl lg:text-3xl font-extrabold text-white leading-tight mb-2">
                Code together, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-100 via-white to-purple-200">
                  in real time.
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                Connect instantly with teammates, sync code with multi-cursor precision, and run 40+ languages right in your browser.
              </p>
            </div>

            {/* Middle Feature Highlights */}
            <div className="relative z-10 my-4 space-y-2.5 hidden sm:block">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-xs lg:text-sm">
                <span className="text-base p-1 bg-white/10 rounded-lg">⚡</span>
                <div>
                  <div className="font-semibold text-white">Live Multiplayer Editing</div>
                  <div className="text-[11px] text-blue-100/80">Real-time sync and cursor tracking</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-xs lg:text-sm">
                <span className="text-base p-1 bg-white/10 rounded-lg">🚀</span>
                <div>
                  <div className="font-semibold text-white">Cloud Code Execution</div>
                  <div className="text-[11px] text-blue-100/80">Zero setup, instant compiler output</div>
                </div>
              </div>
            </div>

            {/* Bottom Sign-in Link */}
            <div className="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between">
              <span className="text-xs text-blue-100">Already have an account?</span>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-medium transition-colors border border-white/20"
              >
                <span>Sign In</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* RIGHT PANEL: Landscape Form & Google Sign Up (50% Equal Width) */}
          <div className="md:w-1/2 p-6 sm:p-7 lg:p-8 flex flex-col justify-center bg-white dark:bg-gray-900">
            {/* Header */}
            <div className="mb-4">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                Create your account
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Join thousands of developers coding together
              </p>
            </div>

            {/* 1-CLICK GOOGLE SIGN UP - No hover background color change */}
            <button
              onClick={handleGoogleSignUp}
              disabled={loading || googleLoading}
              type="button"
              className="cursor-pointer w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {googleLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Connecting with Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Sign up with Google</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative my-3.5 flex items-center">
              <div className="flex-1 border-t border-gray-200 dark:border-gray-800"></div>
              <span className="px-3 text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 font-medium">
                or register with email
              </span>
              <div className="flex-1 border-t border-gray-200 dark:border-gray-800"></div>
            </div>

            {/* Success Notification */}
            {successMessage && (
              <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl text-xs flex items-center">
                <svg className="w-4 h-4 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{successMessage}</span>
              </div>
            )}

            {/* Server Error Notification */}
            {serverError && (
              <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-xs flex items-center">
                <svg className="w-4 h-4 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{serverError}</span>
              </div>
            )}

            {/* Form in 2-Column Grid */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Row 1: Username & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Username */}
                <div>
                  <label htmlFor="username" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      placeholder="johndoe"
                      className={`block w-full pl-8 pr-3 py-2 text-xs sm:text-sm border ${
                        errors.username ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 dark:border-gray-700'
                      } rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50/50 dark:bg-gray-800 dark:text-white transition-colors disabled:opacity-60`}
                    />
                  </div>
                  {errors.username && <p className="mt-1 text-[11px] text-red-500 leading-none">{errors.username}</p>}
                </div>

                {/* Email Address */}
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      placeholder="you@example.com"
                      className={`block w-full pl-8 pr-3 py-2 text-xs sm:text-sm border ${
                        errors.email ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 dark:border-gray-700'
                      } rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50/50 dark:bg-gray-800 dark:text-white transition-colors disabled:opacity-60`}
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-[11px] text-red-500 leading-none">{errors.email}</p>}
                </div>
              </div>

              {/* Row 2: Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={loading}
                      placeholder="••••••••"
                      className={`block w-full pl-8 pr-8 py-2 text-xs sm:text-sm border ${
                        errors.password ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 dark:border-gray-700'
                      } rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50/50 dark:bg-gray-800 dark:text-white transition-colors disabled:opacity-60`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-[11px] text-red-500 leading-none">{errors.password}</p>}
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      disabled={loading}
                      placeholder="••••••••"
                      className={`block w-full pl-8 pr-8 py-2 text-xs sm:text-sm border ${
                        errors.confirmPassword ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 dark:border-gray-700'
                      } rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50/50 dark:bg-gray-800 dark:text-white transition-colors disabled:opacity-60`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="mt-1 text-[11px] text-red-500 leading-none">{errors.confirmPassword}</p>}
                </div>
              </div>

              {/* Compact Password Strength Bar */}
              {formData.password && (
                <div className="bg-gray-50 dark:bg-gray-800/60 px-3 py-1.5 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-gray-500 dark:text-gray-400">Password strength:</span>
                    <span className={`font-semibold ${passwordStrength.color.replace('bg-', 'text-')}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${passwordStrength.color} transition-all duration-300`}
                      style={{ width: `${(passwordStrength.strength / 6) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Terms and Conditions */}
              <div className="pt-0.5">
                <label className="flex items-center text-xs text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="cursor-pointer h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-700 rounded mr-2"
                  />
                  <span>
                    I agree to the{' '}
                    <span className="text-blue-600 dark:text-blue-400 hover:underline">Terms of Service</span> and{' '}
                    <span className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</span>
                  </span>
                </label>
                {errors.terms && <p className="mt-1 text-[11px] text-red-500 leading-none">{errors.terms}</p>}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="cursor-pointer w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            </form>

            {/* Mobile Footer (shown only when left panel is stacked/hidden on small screens) */}
            <div className="mt-3.5 text-center md:hidden">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;