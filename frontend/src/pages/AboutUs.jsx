// src/pages/AboutUs.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { useTheme } from '../Context/useTheme';
import { useUser } from '../Context/userContext';
import { 
  FiCode, 
  FiUsers, 
  FiZap, 
  FiShield, 
  FiCpu, 
  FiGlobe, 
  FiTerminal, 
  FiCheckCircle, 
  FiArrowRight, 
  FiLayers,
  FiAward,
  FiCompass
} from 'react-icons/fi';

const AboutUs = () => {
  const { theme } = useTheme();
  const { user } = useUser();
  const navigate = useNavigate();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const isDark = theme === 'dark';

  const stats = [
    { label: 'Latency Sync', value: '< 25ms', desc: 'Atomic delta synchronization' },
    { label: 'Supported Languages', value: '40+', desc: 'Python, C++, Java, JS & more' },
    { label: 'Real-time Security', value: '100%', desc: 'Encrypted ephemeral sessions' },
    { label: 'Developer Uptime', value: '99.9%', desc: 'High availability clustering' },
  ];

  const pillars = [
    {
      icon: <FiZap className="w-7 h-7 text-amber-400" />,
      title: 'Ultra Low-Latency Sync',
      desc: 'Powered by an intelligent WebSocket diffing engine that synchronizes atomic keystrokes and multi-user cursor coordinates without race conditions or jitter.'
    },
    {
      icon: <FiCpu className="w-7 h-7 text-indigo-400" />,
      title: 'Zero-Setup Cloud Compiler',
      desc: 'Execute untrusted code safely in isolated, high-performance sandboxes. Run, test, and debug scripts across languages with zero local installation overhead.'
    },
    {
      icon: <FiShield className="w-7 h-7 text-emerald-400" />,
      title: 'Host-Centric Lifecycle',
      desc: 'Strict session isolation ensures that only authorized peers join. Rooms are ephemeral and clean up instantly when the host leaves, preserving privacy.'
    },
    {
      icon: <FiUsers className="w-7 h-7 text-sky-400" />,
      title: 'True Pair Programming',
      desc: 'Designed for remote engineering teams, technical interviews, university lab sessions, and open-source hackathons with built-in instant messaging and live feedback.'
    }
  ];

  const techStack = [
    { name: 'Monaco Editor', role: 'VS Code engine in the browser' },
    { name: 'Socket.io & WebSockets', role: 'Real-time bi-directional streaming' },
    { name: 'React 19 & Tailwind', role: 'Fluid modern glassmorphic interface' },
    { name: 'Node.js & Express', role: 'Scalable microservice backend architecture' },
    { name: 'Sandboxed Runtime Engine', role: 'Isolated remote code execution' },
    { name: 'MongoDB Atlas', role: 'Persistent user accounts & authentication' },
  ];

  const handleCTA = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      isDark ? 'bg-gray-900 text-gray-100' : 'bg-[#EDF1FE] text-gray-900'
    }`}>
      <Navbar onLoginClick={() => navigate('/login')} />

      <main className="grow pt-20 pb-16">
        {/* Hero Section */}
        <section className="relative px-4 sm:px-6 lg:px-8 pt-12 pb-20 text-center overflow-hidden">
          {/* Background Ambient Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none -z-10" />
          <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl pointer-events-none -z-10" />

          <div className="max-w-4xl mx-auto">
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-6 border shadow-xs ${
              isDark 
                ? 'bg-indigo-950/60 border-indigo-500/30 text-indigo-300' 
                : 'bg-indigo-50 border-indigo-200 text-indigo-700'
            }`}>
              <FiCompass className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '8s' }} />
              <span>About Collixy Realtime Code Platform</span>
            </div>

            <h1 className={`text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight mb-6 bg-clip-text text-transparent ${
              isDark
                ? 'bg-linear-to-r from-blue-400 via-purple-300 to-indigo-400'
                : 'bg-linear-to-r from-blue-700 via-indigo-600 to-purple-700'
            }`}>
              Building The Future Of Collaborative Engineering
            </h1>

            <p className={`text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed ${
              isDark ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Collixy is engineered to eliminate the friction in remote development. 
              We bring developers together in real time with synchronized code editing, 
              live cursors, sandboxed compilation, and seamless team communication.
            </p>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 rounded-2xl border backdrop-blur-md shadow-xl ${
            isDark 
              ? 'bg-gray-800/40 border-gray-700/60 shadow-black/20' 
              : 'bg-white/70 border-white/60 shadow-indigo-100/50'
          }`}>
            {stats.map((stat, i) => (
              <div key={i} className="text-center p-3">
                <div className={`text-3xl sm:text-4xl font-extrabold mb-1 bg-clip-text text-transparent ${
                  isDark
                    ? 'bg-linear-to-r from-indigo-400 to-purple-400'
                    : 'bg-linear-to-r from-indigo-600 to-blue-600'
                }`}>
                  {stat.value}
                </div>
                <div className={`font-semibold text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  {stat.label}
                </div>
                <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {stat.desc}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Mission & Vision Section */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
          <div className="grid md:grid-cols-2 gap-8 items-stretch">
            {/* Mission */}
            <div className={`p-8 rounded-2xl border backdrop-blur-sm relative overflow-hidden transition-all duration-300 hover:shadow-2xl ${
              isDark 
                ? 'bg-gray-800/50 border-gray-700/70 shadow-black/40 hover:border-indigo-500/40' 
                : 'bg-white/80 border-gray-200/80 shadow-indigo-100/40 hover:border-indigo-300'
            }`}>
              <div className="w-12 h-12 rounded-xl bg-indigo-600/10 text-indigo-500 flex items-center justify-center mb-6">
                <FiAward className="w-6 h-6 text-indigo-500" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Our Mission</h2>
              <p className={`leading-relaxed text-base ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                To empower developers, students, and teams around the globe to build software 
                cohesively without geographic boundaries. We believe writing code together should be as 
                instant, fluid, and natural as conversing in person — without awkward screen-shares, 
                version conflicts, or environment setup delays.
              </p>
            </div>

            {/* Vision */}
            <div className={`p-8 rounded-2xl border backdrop-blur-sm relative overflow-hidden transition-all duration-300 hover:shadow-2xl ${
              isDark 
                ? 'bg-gray-800/50 border-gray-700/70 shadow-black/40 hover:border-purple-500/40' 
                : 'bg-white/80 border-gray-200/80 shadow-indigo-100/40 hover:border-purple-300'
            }`}>
              <div className="w-12 h-12 rounded-xl bg-purple-600/10 text-purple-500 flex items-center justify-center mb-6">
                <FiGlobe className="w-6 h-6 text-purple-500" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Our Vision</h2>
              <p className={`leading-relaxed text-base ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                To establish the benchmark for real-time collaborative development. Whether conducting 
                high-stakes technical interviews, hosting global hackathons, mentoring budding developers, 
                or pair-programming mission-critical features, Collixy delivers an uncompromising, 
                blazing-fast IDE experience directly in the browser.
              </p>
            </div>
          </div>
        </section>

        {/* Core Pillars Section */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-3">Why Engineers Choose Collixy</h2>
            <p className={`text-base max-w-xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Architected from the ground up for speed, reliability, and security in high-concurrency sessions.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {pillars.map((pillar, i) => (
              <div 
                key={i} 
                className={`p-6 rounded-xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                  isDark 
                    ? 'bg-gray-800/40 border-gray-700/60 hover:border-indigo-500/30' 
                    : 'bg-white/70 border-gray-200/70 hover:border-indigo-300'
                }`}
              >
                <div className="mb-4 inline-block p-3 rounded-lg bg-indigo-500/10">
                  {pillar.icon}
                </div>
                <h3 className="text-lg font-bold mb-2">{pillar.title}</h3>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {pillar.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Technology Stack Grid */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
          <div className={`p-8 sm:p-10 rounded-2xl border backdrop-blur-md ${
            isDark 
              ? 'bg-linear-to-b from-gray-800/60 to-gray-900/60 border-gray-700/70' 
              : 'bg-linear-to-b from-white to-blue-50/50 border-gray-200'
          }`}>
            <div className="flex items-center gap-3 mb-6">
              <FiLayers className="w-6 h-6 text-indigo-500" />
              <h2 className="text-2xl font-bold">Built With Modern Open Technologies</h2>
            </div>
            
            <p className={`mb-8 max-w-2xl text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Collixy unites production-grade libraries, sandboxed execution engines, and microservice 
              protocols to guarantee stability, security, and developer joy.
            </p>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {techStack.map((item, i) => (
                <div 
                  key={i}
                  className={`p-4 rounded-xl border transition-colors flex items-start gap-3 ${
                    isDark 
                      ? 'bg-gray-900/50 border-gray-700/50 hover:border-gray-600' 
                      : 'bg-white border-gray-200/80 hover:border-gray-300'
                  }`}
                >
                  <FiCheckCircle className="w-4 h-4 text-emerald-500 mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-sm mb-0.5">{item.name}</h4>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call To Action Banner */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className={`p-10 sm:p-12 rounded-3xl border relative overflow-hidden shadow-2xl ${
            isDark
              ? 'bg-linear-to-r from-indigo-950/80 via-purple-950/60 to-blue-950/80 border-indigo-500/30'
              : 'bg-linear-to-r from-indigo-600 via-blue-600 to-purple-600 text-white border-transparent'
          }`}>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
              Ready to code together in real-time?
            </h2>
            <p className={`max-w-xl mx-auto mb-8 text-base ${isDark ? 'text-indigo-200' : 'text-indigo-100'}`}>
              Join thousands of developers, teams, and mentors collaborating seamlessly on Collixy today.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={handleCTA}
                className="px-6 py-3 rounded-xl font-bold bg-white text-indigo-700 hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <span>{user ? 'Go to Dashboard' : 'Get Started Free'}</span>
                <FiArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/login')}
                className={`px-6 py-3 rounded-xl font-semibold border transition-all cursor-pointer ${
                  isDark
                    ? 'border-indigo-400/40 text-indigo-200 hover:bg-indigo-900/40'
                    : 'border-white/40 text-white hover:bg-white/10'
                }`}
              >
                Sign In
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AboutUs;
