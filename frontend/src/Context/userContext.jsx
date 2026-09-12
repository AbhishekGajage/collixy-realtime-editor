// src/Context/userContext.jsx - FIXED VERSION
import React, { createContext, useState, useEffect, useContext } from 'react';
import { authAPI } from '../services/api';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserFromStorage = async () => {
      try {
        // First check if user is already in localStorage
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('accessToken');
        
        if (storedUser && token) {
          // User exists in localStorage
          setUser(JSON.parse(storedUser));
          setLoading(false);
          console.log('✅ Loaded user from localStorage:', JSON.parse(storedUser).email);
          return;
        }
        
        if (!token) {
          setLoading(false);
          return;
        }

        // If token exists but no user in localStorage, fetch from API
        console.log('🔄 Fetching user from API...');
        const response = await authAPI.getCurrentUser();
        
        if (response.data.success) {
          setUser(response.data.user);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          console.log('✅ Fetched user from API:', response.data.user.email);
        } else {
          // Token might be invalid
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('❌ Failed to load user:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    loadUserFromStorage();
  }, []);

  const login = (userData, token) => {
    console.log('🔑 Logging in user:', userData.email);
    localStorage.setItem('accessToken', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      setUser(null);
      window.location.href = '/';
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    setUser: updateUser, // Expose setUser properly
    login,
    logout,
    loading,
    isAuthenticated: !!user,
  };
  
  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook to use the user context
// eslint-disable-next-line react-refresh/only-export-components
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  return useUser(); // Alias for useUser
};

// ✅ ADD THIS LINE - Export UserContext for useAuth.js to import
export { UserContext };