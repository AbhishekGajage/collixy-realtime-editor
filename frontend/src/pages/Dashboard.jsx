// src/pages/Dashboard.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../Context/userContext.jsx';
import { useTheme } from '../Context/useTheme';
import collixy_logo from "../assets/collixy-logo.svg";
import headphones from '../assets/headphones.svg';
import layout_dashboard from '../assets/layout-dashboard.svg';
import shield_check from '../assets/shield-check.svg';
import users from '../assets/users.svg';
import vector from '../assets/Vector.svg';
import code from '../assets/code.svg';
import FeatureCard from '../components/common/FeatureCard';
import Footer from '../components/common/Footer';
import Switch from '../components/common/Switch';

const Dashboard = () => {
  const { user, logout, loading } = useUser();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isNewUser] = useState(() => {
    // Initialize from localStorage immediately
    const storedIsNewUser = localStorage.getItem('isNewUser');
    return storedIsNewUser === 'true';
  });
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [avatarState, setAvatarState] = useState({
    url: '',
    loaded: false,
    error: false
  });
  const userMenuRef = useRef(null);
  const avatarCache = useRef({}); // Cache avatar URLs to avoid repeated requests

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

  // Memoized function to get avatar URL from user object
  const getAvatarUrl = useCallback((userObj) => {
    if (!userObj) return null;
    
    // Create cache key
    const cacheKey = userObj.id || userObj.email || userObj.username || 'default';
    
    // Check cache first
    if (avatarCache.current[cacheKey]) {
      console.log('📦 Using cached avatar for:', cacheKey);
      return avatarCache.current[cacheKey];
    }
    
    let avatar = '';
    
    // Check for avatar in different possible locations
    if (userObj.avatar) {
      avatar = userObj.avatar;
    } else if (userObj.profilePicture) {
      avatar = userObj.profilePicture;
    } else if (userObj.picture) {
      avatar = userObj.picture;
    } else if (userObj.googlePhotoUrl) {
      avatar = userObj.googlePhotoUrl;
    } else if (userObj.photoURL) {
      avatar = userObj.photoURL;
    } else if (userObj.image) {
      avatar = userObj.image;
    }
    
    // Fix Google avatar URL if needed
    if (avatar && avatar.includes('googleusercontent.com')) {
      // Remove size parameters to get default size (prevents 429 errors)
      avatar = avatar.replace(/=s\d+(-c)?$/, '');
      console.log('🔧 Processed Google avatar URL (removed size param):', avatar);
    }
    
    // If no avatar found in user object, generate one locally without API
    if (!avatar && userObj.username) {
      // Generate avatar locally without external API call
      const initial = userObj.username.charAt(0).toUpperCase();
      console.log('🔄 Using local avatar for:', userObj.username);
      avatar = 'local://' + initial; // Special marker for local avatar
    } else if (!avatar) {
      avatar = 'local://U'; // Default local avatar
    }
    
    // Cache the result
    avatarCache.current[cacheKey] = avatar;
    
    return avatar;
  }, []);

  // Update avatar state when user changes
  useEffect(() => {
    if (user) {
      const newAvatarUrl = getAvatarUrl(user);
      
      // Only update if URL changed
      if (newAvatarUrl !== avatarState.url) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAvatarState({
          url: newAvatarUrl,
          loaded: false,
          error: false
        });
      }
    }
  }, [user, getAvatarUrl, avatarState.url]);

  // Function to create colored avatar locally
  const createLocalAvatar = useCallback((initial) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
      'bg-red-500', 'bg-yellow-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    
    // Use first letter of username or email to deterministically pick color
    const hash = initial.charCodeAt(0);
    const colorIndex = hash % colors.length;
    
    return {
      color: colors[colorIndex],
      initial: initial
    };
  }, []);

  const handleLogout = useCallback(() => {
    // Clear isNewUser flag before logout
    localStorage.setItem('isNewUser', 'false');
    logout();
    navigate('/');
  }, [logout, navigate]);

const handleCreateRoom = useCallback(() => {
  if (user) {
    // Navigate to room creation or dashboard
    navigate('/dashboard/room/create');
  } else {
    // Navigate to login with return URL
    navigate('/login', { 
      state: { 
        from: '/dashboard', 
        message: 'Please login to create a room' 
      } 
    });
  }
}, [navigate, user]);

  const handleJoinRoom = useCallback(() => {
    navigate('/dashboard/room/join');
  }, [navigate]);

  const handleAvatarError = useCallback((e) => {
    console.log('❌ Avatar failed to load, using local fallback');
    
    // Mark as error
    setAvatarState(prev => ({
      ...prev,
      error: true,
      loaded: true
    }));
    
    // Replace with local avatar
    const parent = e.target.parentElement;
    if (parent) {
      const initial = user?.username?.charAt(0)?.toUpperCase() || 'U';
      const localAvatar = createLocalAvatar(initial);
      
      parent.innerHTML = `
        <div class="w-full h-full flex items-center justify-center ${localAvatar.color} text-white font-bold text-lg rounded-full">
          ${initial}
        </div>
      `;
    }
  }, [user, createLocalAvatar]);

  const handleAvatarLoad = useCallback(() => {
    console.log('✅ Avatar loaded successfully');
    setAvatarState(prev => ({
      ...prev,
      loaded: true,
      error: false
    }));
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check authentication and handle isNewUser
  useEffect(() => {
    if (!loading) {
      const token = localStorage.getItem('accessToken');
      
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
        localStorage.setItem('isNewUser', 'false');
      }
    };
  }, [isNewUser]);

  // Get local avatar info
  const getLocalAvatarInfo = useCallback(() => {
    const initial = user?.username?.charAt(0)?.toUpperCase() || 'U';
    return createLocalAvatar(initial);
  }, [user, createLocalAvatar]);

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

  // Determine what to display for avatar
  const localAvatarInfo = getLocalAvatarInfo();
  const displayInitial = user?.username?.charAt(0)?.toUpperCase() || 'U';
  const isLocalAvatar = avatarState.url.startsWith('local://') || avatarState.error;

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-[#EDF1FE]'
    }`}>
      {/* Header with Logo and User Avatar - Navbar Integration */}
      <header className={`
        w-screen h-fit fixed top-0 left-0 z-50 
        backdrop-blur-2xl backdrop-saturate-180 
        border-b transition-all duration-500 ease-out
        ${
          theme === "dark"
            ? "bg-gray-900/40 text-white border-white/5 shadow-2xl shadow-black/40"
            : "bg-white/30 text-black border-black/5 shadow-2xl shadow-black/5"
        }
        before:absolute before:inset-0 before:-z-10 
        before:bg-linear-to-b 
        ${
          theme === "dark"
            ? "before:from-gray-900/60 before:via-gray-900/40 before:to-transparent"
            : "before:from-[#EDF1FE]/70 before:via-white/50 before:to-transparent"
        }
      `}>
        <nav className="h-fit flex items-center justify-between px-4 md:px-6 lg:px-8 py-3">
          {/* Logo */}
          <div className="flex justify-start items-center h-16">
            <img
              src={collixy_logo}
              alt="Collixy Logo"
              className="h-50 w-auto object-contain transition-all duration-300 cursor-pointer"
              onClick={() => navigate("/")}
            />
          </div>

          {/* Right Menu */}
          <div className="flex items-center gap-3 md:gap-4 lg:gap-5">
            <h3 className="text-base md:text-lg lg:text-xl font-semibold cursor-pointer hover:opacity-80 transition-opacity">
              About Us
            </h3>

            {/* User Avatar with Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 focus:outline-none group"
              >
                <div className="text-right hidden sm:block max-w-37.5">
                  <p className={`cursor-pointer font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    {user?.username || 'User'}
                  </p>
                  <p className={`cursor-pointer text-sm truncate ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {user?.email || ''}
                  </p>
                </div>
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full border-2 border-blue-500 group-hover:border-blue-600 transition-colors overflow-hidden ${!avatarState.loaded ? 'bg-blue-100' : ''}`}>
                    {!isLocalAvatar && avatarState.url && !avatarState.error ? (
                      // Try to load external avatar
                      <img
                        src={avatarState.url}
                        alt={user?.username || 'User'}
                        className="w-full h-full object-cover cursor-pointer"
                        onError={handleAvatarError}
                        onLoad={handleAvatarLoad}
                        loading="lazy"
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      // Display local avatar (colored circle with initial)
                      <div className={`cursor-pointer w-full h-full flex items-center justify-center ${localAvatarInfo.color} text-white font-bold text-lg`}>
                        {displayInitial}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
              </button>

              {/* User Menu Dropdown */}
              {showUserMenu && (
                <div className={`cursor-pointer absolute right-0 mt-2 w-64 rounded-xl shadow-lg py-2 z-50 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                  <div className="px-4 py-3 border-b border-gray-700">
                    <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {user?.username || 'User'}
                    </p>
                    <p className={`text-sm truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {user?.email || ''}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="cursor-pointer w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </div>

            {/* Theme Switch */}
            <Switch isOn={theme === "dark"} onToggle={toggleTheme} />
          </div>
        </nav>
      </header>

      {/* User Menu Overlay (when clicking avatar) */}
      {showUserMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)}></div>
      )}

      <main className="grow pt-24">
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