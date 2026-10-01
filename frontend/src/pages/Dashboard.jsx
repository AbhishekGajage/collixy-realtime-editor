// src/pages/Dashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../Context/userContext.jsx';
import { useTheme } from '../Context/useTheme';
import Navbar from '../components/common/Navbar';
import headphones from '../assets/headphones.svg';
import layout_dashboard from '../assets/layout-dashboard.svg';
import shield_check from '../assets/shield-check.svg';
import users from '../assets/users.svg';
import vector from '../assets/Vector.svg';
import code from '../assets/code.svg';
import FeatureCard from '../components/common/FeatureCard';
import Footer from '../components/common/Footer';
import api from '../services/api';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user, loading } = useUser();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [isNewUser] = useState(() => {
    // Initialize from sessionStorage immediately
    const storedIsNewUser = sessionStorage.getItem('isNewUser');
    return storedIsNewUser === 'true';
  });

  const features = [
    {
      title: 'Live Support',
      description: 'Get instant help while you code. Our real-time support ensures quick issue resolution, smooth collaboration, and uninterrupted development for teams of any size.',
      icon: <img src={headphones} alt="Live Support" className="w-10 h-10" />
    },
    {
      title: 'Team Collaboration',
      description: 'Collaborate with your team in real time. Edit code simultaneously, see live cursors, share changes instantly, and communicate efficiently without switching tools.',
      icon: <img src={users} alt="Team Collaboration" className="w-10 h-10" />
    },
    {
      title: 'Seamless Onboarding',
      description: 'Start coding in minutes. Simple setup, intuitive interface, and guided onboarding help developers and teams get productive from day one.',
      icon: <img src={layout_dashboard} alt="Seamless Onboarding" className="w-10 h-10" />
    },
    {
      title: 'Powerful Code Editor',
      description: 'Experience a fast, intelligent editor with syntax highlighting, auto-completion, multi-language support, and customizable workflows built for modern development.',
      icon: <img src={code} alt="Powerful Code Editor" className="w-10 h-10" />
    },
    {
      title: 'Code Quality & Security',
      description: 'Maintain high-quality code with built-in linking, version control integration, access management, and secure real-time synchronization.',
      icon: <img src={shield_check} alt="Code Quality & Security" className="w-10 h-10" />
    },
    {
      title: 'Real-Time Results',
      description: 'Track progress instantly. See changes as they happen, reduce conflicts, accelerate delivery, and turn collaboration into measurable results.',
      icon: <img src={vector} alt="Real-Time Results" className="w-10 h-10" />
    }
  ];

  const handleCreateRoom = useCallback(async () => {
    if (!user) {
      // Navigate to login with return URL
      navigate('/login', { 
        state: { 
          from: '/dashboard', 
          message: 'Please login to create a room' 
        } 
      });
      return;
    }

    try {
      const res = await api.get(`/api/rooms/user-status?username=${encodeURIComponent(user.username)}`);
      if (res.data?.inRoom) {
        toast.error(res.data.message || 'You are already in another room. Please leave that room first before creating a new one.', {
          duration: 5000,
          icon: '⚠️',
        });
        return;
      }
    } catch (err) {
      console.error('Error checking room status:', err);
    }

    // Navigate to room creation
    navigate('/dashboard/room/create');
  }, [navigate, user]);

  const handleJoinRoom = useCallback(() => {
    navigate('/dashboard/room/join');
  }, [navigate]);

  // Check authentication and handle isNewUser
  useEffect(() => {
    if (!loading) {
      const token = sessionStorage.getItem('accessToken');
      
      if (!user && !token) {
        console.log('🚫 No user or token, redirecting to login');
        navigate('/login');
      }
    }
  }, [user, loading, navigate]);

  // Clear isNewUser flag when component unmounts
  useEffect(() => {
    return () => {
      if (isNewUser) {
        sessionStorage.setItem('isNewUser', 'false');
      }
    };
  }, [isNewUser]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        theme === 'dark' ? 'bg-gray-900' : 'bg-[#EDF1FE]'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className={`mt-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        theme === 'dark' ? 'bg-gray-900' : 'bg-[#EDF1FE]'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className={`mt-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Verifying authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-[#EDF1FE]'
    }`}>
      {/* Universal Responsive Navbar */}
      <Navbar />

      <main className="grow pt-28 sm:pt-32">
        {/* Hero Section */}
        <section className={`
          relative
          px-4 sm:px-6 lg:px-8
          py-16 md:py-24 lg:py-32
          text-center
          overflow-hidden
          transition-colors duration-300
          ${theme === 'dark' 
            ? 'bg-linear-to-br from-gray-900/50 to-blue-900/20' 
            : 'bg-linear-to-br from-blue-50/50 to-purple-50/50'
          }
        `}>
          <div className="relative z-10 max-w-4xl mx-auto">
            <h1 className={`
              text-3xl sm:text-5xl md:text-6xl
              font-black
              mb-6 md:mb-8
              leading-tight
              bg-clip-text text-transparent
              ${theme === 'dark'
                ? 'bg-linear-to-r from-blue-400 via-purple-400 to-blue-400'
                : 'bg-linear-to-r from-blue-600 via-purple-600 to-blue-600'
              }
            `}>
              {isNewUser ? `Welcome to Collixy, ${user.username}! 🎉` : `Welcome back, ${user.username}! 👋`}
            </h1>
            
            <p className={`
              text-lg md:text-xl lg:text-2xl
              mb-12 md:mb-16
              max-w-3xl mx-auto
              leading-relaxed
              ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}
            `}>
              Ready to collaborate with your team in real-time? Start a new session or join an existing one.
            </p>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              {/* Create Room Button */}
              <button 
                onClick={handleCreateRoom}
                className={`
                  relative
                  text-white
                  px-8 py-4 md:px-12 md:py-5
                  text-xl md:text-2xl
                  font-bold
                  rounded-2xl
                  transition-all duration-500
                  hover:-translate-y-2
                  hover:shadow-2xl
                  active:scale-95
                  group
                  overflow-hidden
                  cursor-pointer
                  w-full sm:w-auto min-w-50
                  ${theme === 'dark'
                    ? 'bg-linear-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 hover:shadow-blue-500/40'
                    : 'bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:shadow-blue-500/40'
                  }
                `}
              >
                <span className="
                  absolute
                  inset-0
                  bg-linear-to-r from-transparent via-white/20 to-transparent
                  -translate-x-full
                  group-hover:translate-x-full
                  transition-transform duration-1000
                  cursor-pointer
                " />
                
                <div className="flex items-center justify-center">
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Room
                </div>
              </button>
              
              {/* Join Room Button */}
              <button 
                onClick={handleJoinRoom}
                className={`
                  relative
                  px-8 py-4 md:px-12 md:py-5
                  text-xl md:text-2xl
                  font-bold
                  rounded-2xl
                  transition-all duration-500
                  hover:-translate-y-2
                  hover:shadow-2xl
                  active:scale-95
                  group
                  overflow-hidden
                  cursor-pointer
                  border-2
                  w-full sm:w-auto min-w-50
                  ${theme === 'dark'
                    ? 'border-blue-400 text-white hover:bg-blue-600/20 hover:shadow-blue-500/40'
                    : 'border-blue-600 text-blue-600 hover:bg-blue-50 hover:shadow-blue-500/40'
                  }
                `}
              >
                <span className="
                  absolute
                  inset-0
                  bg-linear-to-r from-transparent via-blue-200/20 to-transparent
                  -translate-x-full
                  group-hover:translate-x-full
                  transition-transform duration-1000
                  cursor-pointer
                " />
                
                <div className="flex items-center justify-center">
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Join Room
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className={`
          px-4 sm:px-6 lg:px-8
          py-20 md:py-28 lg:py-36
          max-w-7xl
          mx-auto
          transition-colors duration-300
          ${theme === 'dark' ? 'text-white' : ''}
        `}>
          <div className="text-center mb-16 md:mb-20 lg:mb-24">
            <h2 className={`
              text-3xl sm:text-4xl md:text-5xl
              font-extrabold
              mb-6 md:mb-8
              relative
              inline-block
              ${theme === 'dark' ? 'text-white' : 'text-gray-800'}
            `}>
              Everything You Need to Code Together
              <span className={`
                absolute
                -bottom-4
                left-1/2
                transform -translate-x-1/2
                w-24 h-1.5 md:w-32 md:h-2
                rounded-full
                ${theme === 'dark'
                  ? 'bg-linear-to-r from-blue-400 to-purple-400'
                  : 'bg-linear-to-r from-blue-600 to-purple-600'
                }
              `} />
            </h2>
          </div>
          
          <div className="
            grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3
            gap-8 lg:gap-10
          ">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                theme={theme}
              />
            ))}
          </div>
        </section>
        <Footer/>
      </main>
    </div>
  );
};

export default Dashboard;