import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../Context/userContext.jsx';
import { authAPI } from '../services/api';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useUser();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get token from URL
        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        const error = params.get('error');
        const message = params.get('message');
        
        console.log('🎯 ========== AUTH CALLBACK STARTED ==========');
        console.log('🔑 Token from URL:', token ? token.substring(0, 50) + '...' : 'No token');
        console.log('❌ Error from URL:', error);
        console.log('📝 Message from URL:', message);
        console.log('👤 Current user in context:', user);
        
        if (error) {
          console.error('❌ Auth callback error:', { error, message });
          navigate(`/login?error=${error}&message=${encodeURIComponent(message || '')}`);
          return;
        }
        
        if (!token) {
          console.error('❌ No token in callback URL');
          // Check if user is already logged in
          const existingToken = localStorage.getItem('accessToken');
          if (existingToken) {
            console.log('📦 Found existing token, redirecting to dashboard');
            navigate('/dashboard');
          } else {
            navigate('/login?error=no_token');
          }
          return;
        }
        
        // Store token
        console.log('💾 Storing token in localStorage...');
        localStorage.setItem('accessToken', token);
        console.log('✅ Token stored');
        
        // Remove token from URL for security
        window.history.replaceState({}, document.title, window.location.pathname);
        
        try {
          console.log('🔄 Fetching user data from /api/auth/me...');
          const response = await authAPI.getCurrentUser();
          console.log('✅ Response from /api/auth/me:', response.data);
          
          if (response.data.success) {
            const userData = response.data.user;
            console.log('✅ User authenticated:', userData.email);
            console.log('👤 User data received:', userData);
            
            // Use the login function from context to update user state
            login(userData, token);
            console.log('✅ User state updated in context');
            
            // Navigate to dashboard
            console.log('🚀 Redirecting to dashboard...');
            navigate('/dashboard');
          } else {
            console.error('❌ Failed to get user data - server returned error:', response.data);
            
            // Try to test the token
            try {
              console.log('🔍 Testing token with debug endpoint...');
              const testResponse = await authAPI.getStatus();
              console.log('🔍 Token test result:', testResponse.data);
            } catch (testError) {
              console.error('❌ Token test failed:', testError);
            }
            
            navigate('/login?error=user_fetch_failed');
          }
        } catch (userError) {
          console.error('❌ Failed to fetch user data:', userError);
          console.error('❌ Error details:', userError.response?.data || userError.message);
          
          // Try to test backend connection
          try {
            console.log('🔗 Testing backend connection...');
            const health = await authAPI.healthCheck();
            console.log('🏓 Backend health:', health.data);
          } catch (healthError) {
            console.error('❌ Backend health check failed:', healthError);
          }
          
          // Try to navigate to dashboard anyway
          console.log('⚠️ Navigating to dashboard with token only...');
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('❌ Auth callback error:', error);
        console.error('❌ Error stack:', error.stack);
        navigate(`/login?error=callback_failed&message=${encodeURIComponent(error.message || 'Unknown error')}`);
      }
    };
    
    handleCallback();
  }, [location, navigate, login, user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto"></div>
        <h2 className="mt-4 text-xl font-semibold text-gray-800">Completing Authentication</h2>
        <p className="mt-2 text-gray-600">Please wait while we log you in...</p>
        <div className="mt-6 space-y-2">
          <div className="text-sm text-gray-500">
            Processing Google authentication...
          </div>
          <div className="text-xs text-gray-400">
            Checking backend connection...
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;