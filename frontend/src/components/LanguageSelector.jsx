// components/LanguageSelector.jsx
import { useState, useRef, useEffect } from "react";
import { 
  FiChevronDown, 
  FiSearch,
  FiGlobe,
  FiCode,
  FiCpu,
  FiSmartphone,
  FiTerminal,
  FiDatabase,
  FiBox
} from "react-icons/fi";
import { LANGUAGE_VERSIONS, LANGUAGE_CATEGORIES, LANGUAGE_NAMES } from "../utils/constants";

const LanguageSelector = ({ language, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  const languages = Object.entries(LANGUAGE_VERSIONS);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (lang) => {
    onSelect(lang);
    setIsOpen(false);
    setSearchTerm("");
  };

  const filteredLanguages = languages.filter(([lang]) =>
    lang.toLowerCase().includes(searchTerm.toLowerCase()) ||
    LANGUAGE_NAMES[lang].toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group languages by category
  const groupedLanguages = {};
  filteredLanguages.forEach(([lang, version]) => {
    let foundCategory = "other";
    Object.entries(LANGUAGE_CATEGORIES).forEach(([category, langList]) => {
      if (langList.includes(lang)) {
        foundCategory = category;
      }
    });
    
    if (!groupedLanguages[foundCategory]) {
      groupedLanguages[foundCategory] = [];
    }
    groupedLanguages[foundCategory].push([lang, version]);
  });

  const categoryIcons = {
    web: <FiGlobe className="w-4 h-4 mr-2" />,
    general: <FiCode className="w-4 h-4 mr-2" />,
    systems: <FiCpu className="w-4 h-4 mr-2" />,
    mobile: <FiSmartphone className="w-4 h-4 mr-2" />,
    scripting: <FiTerminal className="w-4 h-4 mr-2" />,
    functional: <FiBox className="w-4 h-4 mr-2" />,
    data: <FiDatabase className="w-4 h-4 mr-2" />,
    other: <FiBox className="w-4 h-4 mr-2" />,
  };

  const categoryNames = {
    web: "Web Development",
    general: "General Purpose",
    systems: "Systems Programming",
    mobile: "Mobile Development",
    scripting: "Scripting",
    functional: "Functional",
    data: "Data Science",
    other: "Other Languages",
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex flex-col mb-2">
        <label className="text-sm font-medium text-gray-400 mb-1">
          Select Language
        </label>
        <button
          className="flex items-center justify-between w-64 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-750 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          onClick={() => setIsOpen(!isOpen)}
          type="button"
        >
          <div className="flex items-center">
            <div className="w-6 h-6 mr-3 flex items-center justify-center bg-indigo-600 rounded">
              <FiCode className="w-3.5 h-3.5" />
            </div>
            <span className="font-medium text-gray-100">
              {LANGUAGE_NAMES[language] || language}
            </span>
          </div>
          <FiChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
      
      {isOpen && (
        <div className="absolute z-50 mt-1 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden">
          {/* Search Bar */}
          <div className="p-3 border-b border-gray-800">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search languages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Languages List */}
          <div className="max-h-96 overflow-y-auto">
            {Object.entries(groupedLanguages).map(([category, langList]) => {
              if (langList.length === 0) return null;
              
              return (
                <div key={category} className="border-b border-gray-800 last:border-b-0">
                  <div className="sticky top-0 z-10 flex items-center px-4 py-2 bg-gray-850 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {categoryIcons[category]}
                    {categoryNames[category]}
                    <span className="ml-auto text-xs bg-gray-800 px-2 py-1 rounded">
                      {langList.length}
                    </span>
                  </div>
                  <div className="py-1">
                    {langList.map(([lang, version]) => (
                      <button
                        key={lang}
                        className={`flex items-center justify-between w-full px-4 py-3 text-sm hover:bg-gray-800 transition-colors ${
                          lang === language ? 'bg-indigo-900/30 text-indigo-300' : 'text-gray-300'
                        }`}
                        onClick={() => handleSelect(lang)}
                        type="button"
                      >
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-3 ${lang === language ? 'bg-indigo-500' : 'bg-gray-600'}`} />
                          <div className="text-left">
                            <div className="font-medium">
                              {LANGUAGE_NAMES[lang]}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {lang}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded">
                            v{version}
                          </span>
                          {lang === language && (
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            
            {filteredLanguages.length === 0 && (
              <div className="py-8 text-center">
                <FiSearch className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No languages found</p>
                <p className="text-sm text-gray-500 mt-1">Try a different search term</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-850 border-t border-gray-800">
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>{filteredLanguages.length} languages available</span>
              <span>Press ESC to close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;