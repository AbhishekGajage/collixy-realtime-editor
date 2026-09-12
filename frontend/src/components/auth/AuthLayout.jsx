//components/auth/AuthLayout.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const AuthLayout = ({ children }) => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 relative overflow-hidden">
      {/* Animated background pattern */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%239C92AC' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          animation: 'moveBackground 20s linear infinite'
        }}
      />
      
      {/* Main container */}
      <div className="w-full max-w-md relative z-10">
        {/* Header with logo */}
        <div className="text-center mb-10">
          <Link 
            to="/" 
            className="text-4xl font-extrabold text-white block drop-shadow-lg"
          >
            COLLIXY
            <span className="block text-sm font-normal mt-1.5 opacity-90 tracking-widest">
              CODE TOGETHER
            </span>
          </Link>
        </div>
        
        {/* Auth card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 md:p-10 shadow-2xl transition-transform duration-300 hover:-translate-y-1">
          {/* Form header */}
          <div className="text-center mb-9">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {isLoginPage ? 'Log in' : 'Sign up'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base leading-relaxed">
              You can collaborate code with friends
            </p>
          </div>
          
          {/* Children (form content) */}
          {children}
          
          {/* Switch link */}
          <div className="text-center mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
              {isLoginPage ? "Don't have an account?" : "Already have an account?"}
              <Link 
                to={isLoginPage ? "/signup" : "/login"} 
                className="text-indigo-600 dark:text-indigo-400 font-semibold ml-2 hover:underline transition-all"
              >
                {isLoginPage ? 'Sign up' : 'Log in'}
              </Link>
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-10 text-white text-sm opacity-80">
          <p>© Collixy 2025. All rights reserved.</p>
        </div>
      </div>

      {/* CSS for the background animation */}
      <style jsx>{`
        @keyframes moveBackground {
          0% { transform: translate(0, 0); }
          100% { transform: translate(100px, 100px); }
        }
      `}</style>
    </div>
  );
};

export default AuthLayout;