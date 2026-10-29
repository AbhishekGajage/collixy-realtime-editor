//components/auth/AuthComponents.jsx
import React from 'react';
// Google Sign-in Button Component
export const GoogleButton = ({ onClick }) => (
  <button
    onClick={onClick}
    className="flex-1 p-3 flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 font-medium text-sm cursor-pointer transition-all hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg hover:-translate-y-0.5"
  >
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
    Google
  </button>
);

// GitHub Sign-in Button Component
export const GitHubButton = ({ onClick }) => (
  <button
    onClick={onClick}
    className="flex-1 p-3 flex items-center justify-center gap-2 bg-gray-900 dark:bg-gray-800 border-2 border-gray-700 rounded-xl text-white font-medium text-sm cursor-pointer transition-all hover:bg-gray-800 dark:hover:bg-gray-700 hover:border-gray-600 hover:shadow-lg hover:-translate-y-0.5"
  >
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
    GitHub
  </button>
);

// Divider Component
export const Divider = ({ text = 'or' }) => (
  <div className="relative text-center my-7 text-gray-400 text-sm">
    <span className="relative z-10 px-3 bg-white dark:bg-gray-900">{text}</span>
    <div className="absolute left-0 right-0 top-1/2 border-t border-gray-200 dark:border-gray-800"></div>
  </div>
);

// Form Input Component
export const FormInput = ({ label, type = 'text', name, value, onChange, placeholder, error }) => (
  <div className="mb-6">
    <label htmlFor={name} className="block text-sm font-semibold text-gray-900 dark:text-white mb-2.5">
      {label}
    </label>
    <input
      id={name}
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full px-4 py-3 border rounded-xl text-gray-900 dark:text-white bg-transparent focus:outline-none focus:ring-2 transition-all ${
        error 
          ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
          : 'border-gray-300 dark:border-gray-700 focus:ring-indigo-500 focus:border-indigo-500'
      }`}
    />
    {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
  </div>
);

// Submit Button Component
export const SubmitButton = ({ children, disabled, loading, onClick, type = 'submit' }) => (
  <button
    type={type}
    disabled={disabled || loading}
    onClick={onClick}
    className={`w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 text-base font-semibold mt-3 rounded-xl border-none cursor-pointer transition-all ${
      disabled || loading 
        ? 'opacity-70 cursor-not-allowed' 
        : 'hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/30'
    }`}
  >
    {loading ? (
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        <span className="ml-2">Processing...</span>
      </div>
    ) : (
      children
    )}
  </button>
);

// Optional: Forgot Password Link Component
export const ForgotPasswordLink = () => (
  <div className="text-right mb-6">
    <a 
      href="/forgot-password" 
      className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
    >
      Forgot password?
    </a>
  </div>
);

// Optional: Remember Me Checkbox Component
export const RememberMeCheckbox = ({ checked, onChange }) => (
  <div className="flex items-center mb-6">
    <input
      type="checkbox"
      id="remember"
      checked={checked}
      onChange={onChange}
      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
    />
    <label htmlFor="remember" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
      Remember me
    </label>
  </div>
);