// services/api.js
import axios from 'axios';
import { LANGUAGE_VERSIONS } from "../utils/constants";

// Backend base URL: configured via environment variable with fallback
const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5001').replace(/\/+$/, '');

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 15000, // Increased timeout
});

const API = axios.create({
  baseURL: "https://emkc.org/api/v2/piston",
  timeout: 10000, // 10 second timeout
});

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request details
    console.log(`🌐 [${config.method?.toUpperCase()}] ${config.baseURL}${config.url}`);
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with better error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ [${response.status}] ${response.config.url}`);
    return response;
  },
  (error) => {
    const errorDetails = {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      code: error.code,
      data: error.response?.data
    };
    
    console.error('❌ API Error:', errorDetails);
    
    // Handle specific error types
    if (error.code === 'ECONNABORTED') {
      console.error('⏰ Request timeout. Is the backend server running?');
      error.message = 'Request timeout. Please check if the backend server is running.';
    } 
    else if (error.code === 'ERR_NETWORK') {
      console.error('🔌 Network error. Backend might be down or not accessible.');
      error.message = 'Cannot connect to server. Please make sure the backend is running at http://localhost:5001';
    }
    else if (error.response?.status === 404) {
      console.error('🔍 Endpoint not found. Check backend routes.');
      error.message = 'API endpoint not found. Please check server configuration.';
    }
    else if (error.response?.status === 500) {
      console.error('💥 Server error. Check backend logs.');
      error.message = error.response?.data?.message || 'Internal server error';
    }
    
    if (error.response?.status === 401) {
      console.log('🔒 Unauthorized, removing token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      // Don't redirect if already on login page
      if (!window.location.pathname.includes('/login')) {
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      }
    }
    
    return Promise.reject(error);
  }
);

// Test backend connection
export const testBackendConnection = async () => {
  try {
    console.log('🔍 Testing backend connection...');
    
    // Try multiple endpoints
    const endpoints = [
      `${API_BASE_URL}/api/health`,
      `${API_BASE_URL}/api/test`,
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔗 Trying: ${endpoint}`);
        const response = await fetch(endpoint, { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          mode: 'cors'
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Connected to: ${endpoint}`, data);
          return { success: true, endpoint, data };
        }
      } catch (err) {
        console.log(`❌ Failed: ${endpoint}`, err.message);
      }
    }
    
    return { 
      success: false, 
      message: `Cannot connect to backend server. Make sure it's running at ${API_BASE_URL}` 
    };
  } catch (error) {
    console.error('Connection test failed:', error);
    return { 
      success: false, 
      message: 'Connection test failed: ' + error.message 
    };
  }
};

// Auth API calls
export const authAPI = {
  // Test backend connection
  testConnection: testBackendConnection,
  
  // Google OAuth
  getGoogleAuthUrl: () => api.get('/api/auth/google/url'),
  
  // Google OAuth debug
  getGoogleDebug: () => api.get('/api/auth/google/debug'),
  
  // Google OAuth config debug
  getGoogleConfigDebug: () => api.get('/api/auth/google/debug-config'),
  
  // Login
  login: (email, password) => 
    api.post('/api/auth/login', { email, password }),
  
  // Register
  //services/api.js
  register: (username, email, password) => 
    api.post('/api/auth/register', { username, email, password }),
  
  // Get current user
  getCurrentUser: () => api.get('/api/auth/me'),
  
  // Logout
  logout: () => api.post('/api/auth/logout'),
  
  // Health check
  healthCheck: () => api.get('/api/health'),
  
  // Environment check
  envCheck: () => api.get('/api/env-check'),
  
  // Auth status
  getStatus: () => api.get('/api/auth/status'),
  
  // Simple test
  test: () => api.get('/api/test'),
};
// Individual export for register function
//services/api.js
export const register = async (userData) => {
  try {
    const response = await api.post('/api/auth/register', userData);
    return response.data;
  } catch (error) {
    console.error('❌ Registration API Error:', error);
    throw error;
  }
};

// Individual export for login function
export const login = async (email, password) => {
  try {
    const response = await api.post('/api/auth/login', { email, password });
    return response.data;
  } catch (error) {
    console.error('❌ Login API Error:', error);
    throw error;
  }
};

// Individual export for logout function  
export const logout = async () => {
  try {
    const response = await api.post('/api/auth/logout');
    return response.data;
  } catch (error) {
    console.error('❌ Logout API Error:', error);
    throw error;
  }
};

// Individual export for getCurrentUser function
export const getCurrentUser = async () => {
  try {
    const response = await api.get('/api/auth/me');
    return response.data;
  } catch (error) {
    console.error('❌ Get Current User API Error:', error);
    throw error;
  }
};

// Individual export for getGoogleAuthUrl function
export const getGoogleAuthUrl = async () => {
  try {
    const response = await api.get('/api/auth/google/url');
    return response.data;
  } catch (error) {
    console.error('❌ Google Auth URL API Error:', error);
    throw error;
  }
};

// Check available languages first
export const getAvailableLanguages = async () => {
  try {
    const response = await API.get("/runtimes");
    return response.data;
  } catch (error) {
    console.error("Failed to fetch available languages:", error);
    return [];
  }
};

// Updated executeCode with better error handling
export const executeCode = async (language, sourceCode) => {
  try {
    // First, let's check if the language is supported by the API
    const runtimes = await getAvailableLanguages();
    const supportedLanguages = runtimes.map(runtime => runtime.language);
    
    if (!supportedLanguages.includes(language)) {
      throw new Error(`Language "${language}" is not supported by the execution engine.`);
    }

    // Find the correct version for the language
    const languageRuntime = runtimes.find(runtime => runtime.language === language);
    const version = LANGUAGE_VERSIONS[language] || languageRuntime?.version || "latest";

    const response = await API.post("/execute", {
      language: language,
      version: version,
      files: [
        {
          content: sourceCode,
        },
      ],
    });
    
    return response.data;
  } catch (error) {
    console.error("Execution error:", error);
    
    // Provide more helpful error messages
    if (error.response) {
      if (error.response.status === 400) {
        throw new Error(`Language "${language}" or its version is not supported. Try a different language.`);
      } else if (error.response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      } else if (error.response.status === 500) {
        throw new Error("Server error. The execution engine might be down.");
      }
    } else if (error.code === 'ECONNABORTED') {
      throw new Error("Request timeout. The execution took too long.");
    }
    
    throw error;
  }
};

export default api;