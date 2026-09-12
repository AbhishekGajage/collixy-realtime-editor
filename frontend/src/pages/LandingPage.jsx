// src/pages/LandingPage.jsx
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import headphones from '../assets/headphones.svg';
import layout_dashboard from '../assets/layout-dashboard.svg';
import shield_check from '../assets/shield-check.svg';
import users from '../assets/users.svg';
import vector from '../assets/Vector.svg';
import code from '../assets/code.svg';
import FeatureCard from '../components/common/FeatureCard';
import { useTheme } from '../Context/useTheme';
import { useUser } from '../Context/userContext';
import Footer from '../components/common/Footer';

const LandingPage = () => {
  const { theme } = useTheme();
  const { user } = useUser();
  const navigate = useNavigate();

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

  // Handle Get Started button - if user is logged in, go to dashboard
  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };
  
  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-[#EDF1FE]'
    }`}>
      <Navbar onLoginClick={() => navigate('/login')} />
      
      <main className="grow pt-16">
        {/* Hero Section */}
        <section className={`
          relative
          px-4 sm:px-6 lg:px-8
          py-24 md:py-32 lg:py-40
          text-center
          overflow-hidden
          transition-colors duration-300
          ${theme === 'dark' 
            ? 'bg-linear-to-br from-gray-900/50 to-blue-900/20' 
            : 'bg-linear-to-br from-blue-50/50 to-purple-50/50'
          }
        `}>
          {/* Animated background pattern */}
          <div className="
            absolute
            inset-0
            opacity-10 dark:opacity-5
            bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI3NSIgaGVpZ2h0PSI3NSIgcGF0dGVyblRyYW5zZm9ybT0icm90YXRlKDApIj48cGF0aCBkPSJNIDAgMCBMIDAgNzUgTCA3NSA3NSBMIDc1IDAgWiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDU5LCAxMzAsIDI0NiwgMC4wNSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')]
            animate-[moveBackground_20s_linear_infinite]
          " />
          
          <div className="relative z-10 max-w-7xl mx-auto">
            <h1 className={`
              text-4xl sm:text-6xl md:text-7xl
              font-black
              mb-6 md:mb-8
              leading-tight
              bg-clip-text text-transparent
              ${theme === 'dark'
                ? 'bg-linear-to-r from-blue-400 via-purple-400 to-blue-400'
                : 'bg-linear-to-r from-blue-600 via-purple-600 to-blue-600'
              }
            `}>
              Code With Your Team Live
            </h1>
            
            <p className={`
              text-xl md:text-2xl lg:text-2xl
              mb-10 md:mb-12 lg:mb-16
              max-w-3xl mx-auto
              leading-relaxed
              ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}
            `}>
              Real-time collaborative coding platform for developers
            </p>
            
            <button 
              onClick={handleGetStarted}
              className={`
                relative
                text-white
                px-7 py-3 md:px-10 md:py-4
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
                ${theme === 'dark'
                  ? 'bg-linear-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 hover:shadow-blue-500/40'
                  : 'bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:shadow-blue-500/40'
                }
              `}
            >
              {/* Shimmer effect */}
              <span className="
                absolute
                inset-0
                bg-linear-to-r from-transparent via-white/20 to-transparent
                -translate-x-full
                group-hover:translate-x-full
                transition-transform duration-1000
                cursor-pointer
              " />
              
              {user ? 'Go to Dashboard' : 'Get Started'}
            </button>
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
              text-4xl sm:text-5xl md:text-6xl
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

export default LandingPage;