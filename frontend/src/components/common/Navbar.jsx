// src/components/common/Navbar.jsx
import React, { useState, useEffect, useRef } from "react";
import collixy_logo from "../../assets/collixy-logo.svg";
import get_icon from "../../assets/get_started.png";
import Switch from "../common/Switch";
import { useTheme } from "../../Context/useTheme";
import { useUser } from "../../Context/userContext";
import { useNavigate, useLocation } from "react-router-dom";

const Navbar = ({ onLoginClick }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const menuRef = useRef(null);
  const userMenuRef = useRef(null);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setShowUserMenu(false);
  }, [location.pathname]);

  // Close mobile menu on resize to desktop (md breakpoint = 768px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close menus on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    setAvatarError(false);
  }, [user]);

  const handleNavClick = (path) => {
    setMobileMenuOpen(false);
    setShowUserMenu(false);
    if (location.pathname === path) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(path);
    }
  };

  const handleActionClick = (action) => {
    setMobileMenuOpen(false);
    setShowUserMenu(false);
    if (action) {
      action();
    } else {
      navigate('/login');
    }
  };

  const handleLogout = () => {
    setShowUserMenu(false);
    setMobileMenuOpen(false);
    sessionStorage.setItem('logging_out', 'true');
    sessionStorage.setItem('isNewUser', 'false');
    logout();
    navigate('/', { replace: true });
  };

  const getAvatarUrl = () => {
    if (!user) return null;
    let avatar = user.avatar || user.profilePicture || user.picture || user.googlePhotoUrl || user.photoURL || user.image;
    if (avatar && typeof avatar === 'string' && avatar.includes('googleusercontent.com')) {
      avatar = avatar.replace(/=s\d+(-c)?$/, '');
    }
    return avatar;
  };

  const avatarUrl = getAvatarUrl();
  const initial = user?.username ? user.username.charAt(0).toUpperCase() : 'U';
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
    'bg-red-500', 'bg-yellow-500', 'bg-indigo-500', 'bg-teal-500'
  ];
  const colorIndex = initial.charCodeAt(0) % colors.length;
  const localColor = colors[colorIndex];

  return (
    <header
      ref={menuRef}
      className={`w-full fixed top-0 left-0 z-50 
        backdrop-blur-2xl backdrop-saturate-180 
        border-b transition-all duration-300 ease-out
        ${
          theme === "dark"
            ? "bg-gray-900/60 text-white border-white/5 shadow-2xl shadow-black/40"
            : "bg-white/50 text-black border-black/5 shadow-2xl shadow-black/5"
        }
        before:absolute before:inset-0 before:-z-10 
        before:bg-linear-to-b 
        ${
          theme === "dark"
            ? "before:from-gray-900/80 before:via-gray-900/50 before:to-transparent"
            : "before:from-[#EDF1FE]/80 before:via-white/60 before:to-transparent"
        }
      `}
    >
      <nav className="w-full flex items-center justify-between px-4 sm:px-6 md:px-10 lg:px-14 xl:px-16 py-2.5 sm:py-3 md:py-3.5">
        {/* Logo */}
        <div className="flex justify-start items-center">
          <img
            src={collixy_logo}
            alt="Collixy Logo"
            className="h-10 sm:h-12 md:h-14 lg:h-16 w-auto object-contain transition-all duration-300 cursor-pointer hover:opacity-95"
            onClick={() => handleNavClick(user ? "/dashboard" : "/")}
          />
        </div>

        {/* Desktop / Tablet Menu (hidden on mobile, visible on md+) */}
        <div className="hidden md:flex items-center gap-3 sm:gap-4 md:gap-5 lg:gap-6">
          <button
            onClick={() => handleNavClick("/about")}
            className="text-sm md:text-base font-semibold cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-0"
          >
            About Us
          </button>

          {user ? (
            /* Authenticated User Menu */
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 focus:outline-none cursor-pointer group"
                aria-label="User menu"
              >
                <div className="text-right hidden sm:block max-w-37.5">
                  <p className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    {user.username || 'User'}
                  </p>
                  <p className={`text-sm truncate ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {user.email || ''}
                  </p>
                </div>

                <div className="relative">
                  <div className="w-10 h-10 rounded-full border-2 border-blue-500 group-hover:border-blue-600 transition-colors overflow-hidden">
                    {avatarUrl && !avatarError ? (
                      <img
                        src={avatarUrl}
                        alt={user.username || 'User'}
                        className="w-full h-full object-cover cursor-pointer"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        loading="lazy"
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <div className={`cursor-pointer w-full h-full flex items-center justify-center ${localColor} text-white font-bold text-lg`}>
                        {initial}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className={`absolute right-0 mt-2 w-60 rounded-2xl shadow-2xl py-2 z-50 border transition-all ${
                  theme === 'dark'
                    ? 'bg-gray-800/95 border-white/10 text-white backdrop-blur-2xl'
                    : 'bg-white/95 border-black/5 text-gray-800 backdrop-blur-2xl shadow-blue-500/10'
                }`}>
                  <div className="px-4 py-3 border-b border-gray-200/20">
                    <p className="font-semibold text-sm truncate">{user.username}</p>
                    <p className="text-xs opacity-70 truncate">{user.email}</p>
                  </div>

                  {location.pathname !== '/dashboard' && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/dashboard');
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                        theme === 'dark' ? 'hover:bg-white/10 text-gray-200' : 'hover:bg-gray-100 text-gray-800'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      <span>Dashboard</span>
                    </button>
                  )}

                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Unauthenticated Buttons */
            <>
              {/* Login Button */}
              <button
                onClick={onLoginClick}
                className={`cursor-pointer px-4 md:px-5 py-2 rounded-xl text-sm font-medium tracking-wider transition-colors ${
                  theme === "dark"
                    ? "bg-white hover:bg-blue-50 text-black"
                    : "bg-[#0F2854] hover:bg-[#0a1f42] text-white"
                }`}
              >
                Login
              </button>

              {/* Get Started Button */}
              <button
                className={`cursor-pointer flex items-center gap-2 px-4 md:px-5 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  theme === "dark"
                    ? "bg-white hover:bg-blue-50 text-blue-900"
                    : "bg-[#0a84ff3f] hover:bg-[#0a84ff5f] text-blue-700"
                }`}
                onClick={onLoginClick}
              >
                <img
                  src={get_icon}
                  alt="Get started"
                  className="h-4 w-4"
                />
                <span>Get started</span>
              </button>
            </>
          )}

          <Switch isOn={theme === "dark"} onToggle={toggleTheme} />
        </div>

        {/* Mobile Action Bar: Theme Switch + Hamburger Button */}
        <div className="flex md:hidden items-center gap-2 sm:gap-3">
          <Switch isOn={theme === "dark"} onToggle={toggleTheme} />

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center ${
              theme === "dark"
                ? "border-white/10 hover:bg-white/10 text-white"
                : "border-gray-200 hover:bg-gray-100 text-gray-800"
            }`}
          >
            {mobileMenuOpen ? (
              /* Close Icon */
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              /* Hamburger Icon */
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Dropdown Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out border-t ${
          mobileMenuOpen ? "max-h-96 opacity-100 py-4" : "max-h-0 opacity-0 py-0 border-transparent pointer-events-none"
        } ${
          theme === "dark"
            ? "border-white/10 bg-gray-900/95 backdrop-blur-2xl text-white"
            : "border-black/5 bg-white/95 backdrop-blur-2xl text-gray-900 shadow-xl"
        }`}
      >
        <div className="flex flex-col gap-3 px-4 sm:px-6">
          <button
            onClick={() => handleNavClick("/about")}
            className={`text-left text-base font-semibold py-2 px-3 rounded-lg transition-colors cursor-pointer ${
              theme === "dark" ? "hover:bg-white/10 text-gray-100" : "hover:bg-gray-100 text-gray-800"
            }`}
          >
            About Us
          </button>

          {user ? (
            /* User Info & Actions in Mobile Drawer */
            <div className="pt-2 border-t border-gray-200/20 flex flex-col gap-3">
              <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5">
                <div className="w-10 h-10 rounded-full border-2 border-blue-500 overflow-hidden flex items-center justify-center shrink-0">
                  {avatarUrl && !avatarError ? (
                    <img 
                      src={avatarUrl} 
                      alt={user.username || 'User'} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      loading="lazy"
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${localColor} text-white font-bold text-lg`}>
                      {initial}
                    </div>
                  )}
                </div>
                <div className="truncate">
                  <p className="font-semibold text-sm truncate">{user.username}</p>
                  <p className="text-xs opacity-70 truncate">{user.email}</p>
                </div>
              </div>

              {location.pathname !== '/dashboard' && (
                <button
                  onClick={() => handleNavClick('/dashboard')}
                  className={`w-full py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors text-left flex items-center gap-2 cursor-pointer ${
                    theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                  }`}
                >
                  Dashboard
                </button>
              )}

              <button
                onClick={handleLogout}
                className="w-full py-2.5 px-3 rounded-xl text-sm font-semibold text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          ) : (
            /* Unauthenticated Mobile Actions */
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-200/20">
              <button
                onClick={() => handleActionClick(onLoginClick)}
                className={`w-full justify-center py-2.5 rounded-xl text-sm font-semibold tracking-wider transition-colors cursor-pointer ${
                  theme === "dark"
                    ? "bg-white hover:bg-gray-100 text-black"
                    : "bg-[#0F2854] hover:bg-[#0a1f42] text-white"
                }`}
              >
                Login
              </button>

              <button
                onClick={() => handleActionClick(onLoginClick)}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  theme === "dark"
                    ? "bg-blue-600/30 hover:bg-blue-600/40 text-blue-200 border border-blue-500/30"
                    : "bg-[#0a84ff20] hover:bg-[#0a84ff35] text-blue-700 border border-blue-400/30"
                }`}
              >
                <img src={get_icon} alt="Get started" className="h-4 w-4" />
                <span>Get started</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;

