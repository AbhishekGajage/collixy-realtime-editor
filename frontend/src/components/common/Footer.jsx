import React from 'react';
import logo from '../../assets/collixy-logo-icon.svg';
import { useTheme } from "../../Context/useTheme";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { theme } = useTheme();

  return (
    <footer className={`w-full py-6 ${theme === "dark" 
      ? "bg-gray-900 text-white" 
      : "bg-linear-to-b from-blue-50 to-white text-gray-800"
    }`}>
      <div className="px-4 w-full">
        {/* Main Footer Content */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
          
          {/* Logo and Navigation */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="">
              <img 
                src={logo} 
                alt="Collixy Logo" 
                className="h-50 w-auto"
              />
            </div>
            
            {/* Navigation Links */}
            <div className="flex gap-4 md:gap-6">
              <button className={`font-medium text-sm md:text-base transition-colors whitespace-nowrap ${
                theme === "dark" 
                  ? "text-gray-300 hover:text-white" 
                  : "text-gray-600 hover:text-gray-900"
              }`}>
                Features
              </button>
              <button className={`font-medium text-sm md:text-base transition-colors whitespace-nowrap ${
                theme === "dark" 
                  ? "text-gray-300 hover:text-white" 
                  : "text-gray-600 hover:text-gray-900"
              }`}>
                Learn More
              </button>
              <button className={`font-medium text-sm md:text-base transition-colors whitespace-nowrap ${
                theme === "dark" 
                  ? "text-gray-300 hover:text-white" 
                  : "text-gray-600 hover:text-gray-900"
              }`}>
                Support
              </button>
            </div>
          </div>
          
          {/* Social Media Icons */}
          <div className="flex gap-3">
            {/* Twitter/X */}
            <button className={`cursor-pointer transition-all duration-300 w-10 h-10 rounded-full flex items-center justify-center ${
              theme === "dark" 
                ? "bg-gray-800 hover:bg-gray-700" 
                : "bg-blue-100 hover:bg-blue-200"
            }`}>
              <span className={`font-bold ${theme === "dark" ? "text-white" : "text-gray-700"}`}>
                𝕏
              </span>
            </button>
            
            {/* LinkedIn */}
            <button className={`cursor-pointer transition-all duration-300 w-10 h-10 rounded-full flex items-center justify-center ${
              theme === "dark" 
                ? "bg-gray-800 hover:bg-gray-700" 
                : "bg-blue-100 hover:bg-blue-200"
            }`}>
              <span className={`font-bold ${theme === "dark" ? "text-white" : "text-blue-600"}`}>
                in
              </span>
            </button>
            
            {/* GitHub */}
            <button className={`cursor-pointer transition-all duration-300 w-10 h-10 rounded-full flex items-center justify-center ${
              theme === "dark" 
                ? "bg-gray-800 hover:bg-gray-700" 
                : "bg-gray-100 hover:bg-gray-200"
            }`}>
              <span className={`font-bold ${theme === "dark" ? "text-white" : "text-gray-700"}`}>
                ⎘
              </span>
            </button>
            
          
          </div>
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
            <button className={`transition-colors ${
              theme === "dark" 
                ? "text-gray-400 hover:text-gray-300" 
                : "text-gray-500 hover:text-gray-700"
            }`}>
              Privacy Policy
            </button>
            <button className={`transition-colors ${
              theme === "dark" 
                ? "text-gray-400 hover:text-gray-300" 
                : "text-gray-500 hover:text-gray-700"
            }`}>
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