// src/components/common/Navbar.jsx
import collixy_logo from "../../assets/collixy-logo.svg";
import get_icon from "../../assets/get_started.png";
import Switch from "../common/Switch";
import { useTheme } from "../../Context/useTheme";
import { useNavigate } from "react-router-dom";

const Navbar = ({ onLoginClick }) => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <header
      className={`w-screen h-fit fixed top-0 left-0 z-50 
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
`}
    >
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

          {/* Login Button - Opens Modal */}
          <button
            onClick={onLoginClick}
            className={`cursor-pointer px-4 md:px-5 lg:px-6 py-2 rounded-xl text-sm md:text-base lg:text-lg font-medium tracking-wider transition-colors ${
              theme === "dark"
                ? "bg-white hover:bg-blue-50 text-black"
                : "bg-[#0F2854] hover:bg-[#0a1f42] text-white"
            }`}
          >
            Login
          </button>

          {/* Get Started Button - Opens Modal */}
          <button
            className={`cursor-pointer flex items-center gap-2 px-4 md:px-5 py-2 rounded-xl text-sm md:text-base lg:text-lg font-medium transition-all duration-300 ${
              theme === "dark"
                ? "bg-white hover:bg-blue-50 text-blue-900"
                : "bg-[#0a84ff3f] hover:bg-[#0a84ff5f] text-blue-700"
            }`}
            onClick={onLoginClick}
          >
            <img
              src={get_icon}
              alt="Get started"
              className="h-4 w-4 md:h-5 md:w-5"
            />
            <span>Get started</span>
          </button>

          <Switch isOn={theme === "dark"} onToggle={toggleTheme} />
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
