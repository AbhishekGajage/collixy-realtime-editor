// src/components/common/FeatureCard.jsx
import React from 'react';
import { useTheme } from '../../Context/useTheme';

const FeatureCard = ({ icon, title, description }) => {
  const { theme } = useTheme();
  
  // Function to apply theme to SVG icons
  const applyThemeToIcon = (iconElement) => {
    if (React.isValidElement(iconElement) && iconElement.type === 'img') {
      // For image icons, apply filter for dark mode
      return React.cloneElement(iconElement, {
        className: `${iconElement.props.className || ''} ${
          theme === 'dark' ? 'invert brightness-0 saturate-0' : ''
        }`
      });
    }
    return iconElement;
  };

  return (
    <div className={`
      rounded-2xl
      p-6 md:p-8
      transition-all duration-500 ease-in-out
      h-full
      flex flex-col
      relative
      overflow-hidden
      hover:-translate-y-3
      hover:shadow-2xl
      border
      group
      ${theme === 'dark'
        ? 'bg-linear-to-b from-gray-800 to-gray-900 border-gray-700 hover:border-blue-400/50 hover:shadow-blue-500/10'
        : 'bg-linear-to-b from-white to-gray-50 border-gray-200 hover:border-blue-500/50 hover:shadow-blue-500/20'
      }
    `}>
      {/* Animated gradient border */}
      <div className={`
        absolute
        inset-0
        rounded-2xl
        p-px
        transition-opacity duration-500
        opacity-0
        group-hover:opacity-100
        ${theme === 'dark'
          ? 'bg-linear-to-r from-blue-500 via-purple-500 to-blue-500'
          : 'bg-linear-to-r from-blue-600 via-purple-600 to-blue-600'
        }
      `}>
        <div className={`
          absolute
          inset-0
          rounded-2xl
          ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}
        `} />
      </div>
      
      <div className="relative z-10 flex flex-col h-full">
        {/* Icon */}
        <div className={`
          relative
          text-4xl md:text-5xl
          mb-6 md:mb-8
          w-20 h-20
          flex
          items-center
          justify-center
          rounded-2xl
          transform
          group-hover:scale-110
          group-hover:rotate-3
          transition-all duration-700
          overflow-hidden
          ${theme === 'dark'
            ? 'bg-linear-to-br from-blue-900/40 to-purple-900/40'
            : 'bg-linear-to-br from-blue-50 to-purple-50'
          }
        `}>
          {/* Shimmer effect */}
          <div className={`
            absolute
            inset-0
            bg-linear-to-r from-transparent via-white/40 to-transparent
            -translate-x-full
            group-hover:translate-x-full
            transition-transform duration-1000
            ${theme === 'dark' ? 'via-white/20' : 'via-white/40'}
          `} />
          {applyThemeToIcon(icon)}
        </div>
        
        {/* Title */}
        <h3 className={`
          text-2xl md:text-3xl
          font-bold
          mb-4 md:mb-6
          leading-tight
          transition-all duration-500
          group-hover:translate-x-2
          ${theme === 'dark'
            ? 'text-white group-hover:text-blue-300'
            : 'text-gray-900 group-hover:text-blue-600'
          }
        `}>
          {title}
        </h3>
        
        {/* Description */}
        <p className={`
          text-base md:text-lg
          leading-relaxed
          grow
          transition-colors duration-500
          ${theme === 'dark'
            ? 'text-gray-300 group-hover:text-gray-200'
            : 'text-gray-600 group-hover:text-gray-700'
          }
        `}>
          {description}
        </p>
      </div>
    </div>
  );
};

export default FeatureCard;