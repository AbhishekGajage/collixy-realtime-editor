// frontend/src/hooks/useAuth.js - FIXED
import { useContext } from 'react';
import { UserContext } from '../Context/userContext.jsx'; // ✅ Named import

export const useAuth = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useAuth must be used within a UserProvider');
  }
  return context;
};