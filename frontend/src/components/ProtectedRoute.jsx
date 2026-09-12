// src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = ({ children }) => {
  // NOTE: userContext exposes `loading`, not `isLoading`. Destructuring the wrong
  // name made this gate always falsy, so every hard refresh fell through to the
  // !user check before localStorage had hydrated and bounced the user to /login.
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Checking your session…</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated, remembering where they were headed so the
  // login page can send them back (e.g. a shared /room/:roomId invite link).
  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: `${location.pathname}${location.search}` }}
        replace
      />
    );
  }

  // Render the protected component
  return children;
};

export default ProtectedRoute;
