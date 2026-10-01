import React from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/collixy-logo-icon.svg';
import { useTheme } from "../../Context/useTheme";
import SocialTooltip from './SocialTooltip';

const Footer = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const { theme } = useTheme();

  const handleLinkClick = (path) => {
    if (window.location.pathname === path) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(path);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  return (
    <footer className={`w-full py-6 ${theme === "dark" 
      ? "bg-gray-900 text-white" 
      : "bg-linear-to-b from-blue-50 to-white text-gray-800"
    }`}>
      <div className="w-full px-4 sm:px-6 md:px-10 lg:px-14 xl:px-16">
        {/* Main Footer Content */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
          
          {/* Logo and Navigation */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="cursor-pointer" onClick={() => handleLinkClick('/')}>
              <img 
                src={logo} 
                alt="Collixy Logo" 
                className="h-9 md:h-11 w-auto object-contain transition-transform hover:scale-105"
              />
            </div>
            
            {/* Navigation Links */}
            <div className="flex gap-4 md:gap-6">
              <button 
                onClick={() => handleLinkClick('/about')}
                className={`font-medium text-sm md:text-base transition-colors whitespace-nowrap cursor-pointer ${
                  theme === "dark" 
                    ? "text-gray-300 hover:text-white" 
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                About Us
              </button>
              <button 
                onClick={() => {
                  if (window.location.pathname === '/') {
                    const el = document.getElementById('features');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    navigate('/');
                  }
                }}
                className={`font-medium text-sm md:text-base transition-colors whitespace-nowrap cursor-pointer ${
                  theme === "dark" 
                    ? "text-gray-300 hover:text-white" 
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Features
              </button>
              <button 
                onClick={() => navigate('/login')}
                className={`font-medium text-sm md:text-base transition-colors whitespace-nowrap cursor-pointer ${
                  theme === "dark" 
                    ? "text-gray-300 hover:text-white" 
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Support
              </button>
            </div>
          </div>
          
          {/* Social Media Tooltip Icons */}
          <SocialTooltip />
        </div>
        
        {/* Divider */}
        <div className={`h-px w-full mb-4 ${
          theme === "dark" 
            ? "bg-gray-700" 
            : "bg-linear-to-r from-transparent via-gray-300 to-transparent"
        }`} />
        
        {/* Copyright and Links */}
        <div className="flex flex-col md:flex-row items-center justify-evenly gap-4">
          {/* Copyright */}
          <div className={`text-sm ${
            theme === "dark" ? "text-gray-400" : "text-gray-500"
          }`}>
            © Collixy {currentYear}. All rights reserved.
          </div>
          
          {/* Additional Links */}
          <div className="flex gap-4 text-sm">
            <button 
              onClick={() => handleLinkClick('/privacy')}
              className={`transition-colors cursor-pointer ${
                theme === "dark" 
                  ? "text-gray-400 hover:text-gray-300" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Privacy Policy
            </button>
            <button 
              onClick={() => handleLinkClick('/terms')}
              className={`transition-colors cursor-pointer ${
                theme === "dark" 
                  ? "text-gray-400 hover:text-gray-300" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Terms of Service
            </button>
            <button className={`transition-colors ${
              theme === "dark" 
                ? "text-gray-400 hover:text-gray-300" 
                : "text-gray-500 hover:text-gray-700"
            }`}>
              Cookie Policy
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;