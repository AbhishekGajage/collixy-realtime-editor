// src/pages/PrivacyPolicy.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { useTheme } from '../Context/useTheme';
import { 
  FiShield, 
  FiLock, 
  FiEyeOff, 
  FiServer, 
  FiDatabase, 
  FiUserCheck, 
  FiMail, 
  FiClock,
  FiCheckCircle,
  FiArrowRight,
  FiFileText
} from 'react-icons/fi';

const PrivacyPolicy = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const corePillars = [
    {
      icon: <FiEyeOff className="w-6 h-6 text-purple-400" />,
      title: 'Zero Code Mining',
      desc: 'We never sell, analyze, or train machine learning models on your source code or editor buffers.'
    },
    {
      icon: <FiLock className="w-6 h-6 text-blue-400" />,
      title: 'Ephemeral Rooms',
      desc: 'When the host terminates a room session, memory buffers and active WebSocket sockets are purged.'
    },
    {
      icon: <FiServer className="w-6 h-6 text-emerald-400" />,
      title: 'Sandboxed Execution',
      desc: 'Code execution occurs in ephemeral, network-isolated sandboxes destroyed immediately after evaluation.'
    },
    {
      icon: <FiShield className="w-6 h-6 text-pink-400" />,
      title: 'TLS 1.3 Encryption',
      desc: 'All data in transit, including editor deltas and real-time chat, is encrypted end-to-end via TLS.'
    }
  ];

  const sections = [
    {
      id: 'collection',
      icon: <FiDatabase className="w-5 h-5 text-blue-400" />,
      title: '1. Information We Collect',
      content: (
        <div className="space-y-4">
          <p>
            At Collixy, we practice strict data minimization. We only collect information strictly necessary to provide high-performance, real-time collaborative development services:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className={isDark ? 'text-white' : 'text-gray-900'}>Account Information:</strong> When you register or authenticate via OAuth (e.g., GitHub or email), we store your chosen username, email address, and avatar reference for user identity within collaboration rooms.
            </li>
            <li>
              <strong className={isDark ? 'text-white' : 'text-gray-900'}>Real-Time Collaboration Data:</strong> Code deltas, cursor coordinates, and in-room chat messages are processed in real-time through WebSockets. This state is maintained ephemerally in active server memory to keep connected peers synchronized.
            </li>
            <li>
              <strong className={isDark ? 'text-white' : 'text-gray-900'}>Technical Telemetry:</strong> To guarantee service stability and detect malicious distributed denial-of-service (DDoS) activity, we collect standard server logs including truncated IP addresses, browser user-agents, and connection timestamps.
            </li>
          </ul>
        </div>
      )
    },
    {
      id: 'usage',
      icon: <FiServer className="w-5 h-5 text-indigo-400" />,
      title: '2. How We Use Your Information',
      content: (
        <div className="space-y-4">
          <p>We process collected data exclusively for the following operational purposes:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Facilitating instant pair-programming synchronization between invited room participants.</li>
            <li>Authenticating your account and managing user profiles.</li>
            <li>Spawning isolated compute sandboxes to compile and return execution output for supported programming languages.</li>
            <li>Monitoring infrastructure health, uptime, and system performance metrics.</li>
            <li>Enforcing room security, detecting unauthorized access, and defending against automated abuse.</li>
          </ul>
          <p className="italic text-sm">
            We will never sell, rent, or monetize your personal information or codebase to third parties or marketing platforms.
          </p>
        </div>
      )
    },
    {
      id: 'ephemeral',
      icon: <FiLock className="w-5 h-5 text-emerald-400" />,
      title: '3. Ephemeral Code Architecture & Retention',
      content: (
        <div className="space-y-4">
          <p>
            Collixy is engineered around a privacy-first, host-controlled lifecycle:
          </p>
          <div className={`p-4 rounded-xl border ${
            isDark ? 'bg-gray-800/60 border-white/10' : 'bg-blue-50/80 border-blue-200/60'
          }`}>
            <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <FiCheckCircle className="text-emerald-500 w-5 h-5" /> Host-Leave Room Purge Policy
            </h4>
            <p className="text-sm">
              Collaboration rooms belong strictly to the creating host. Once the host exits the editor session, the room is permanently closed. In-memory code buffers, cursor states, and participant channels are immediately flushed from server RAM.
            </p>
          </div>
          <p>
            Code sent for remote compilation is executed inside an ephemeral Docker-isolated sandbox with restricted CPU, memory, and networking capabilities. As soon as program execution finishes, the container is destroyed and stdout/stderr results are relayed back over your secure socket.
          </p>
        </div>
      )
    },
    {
      id: 'cookies',
      icon: <FiFileText className="w-5 h-5 text-amber-400" />,
      title: '4. Cookies & Local Storage',
      content: (
        <div className="space-y-3">
          <p>
            We do not use tracking pixels, ad cookies, or cross-site tracking beacons. We only utilize essential first-party browser storage:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className={isDark ? 'text-white' : 'text-gray-900'}>Session Tokens:</strong> Secure HTTP-only cookies and local web storage to keep you logged in between browser refreshes.
            </li>
            <li>
              <strong className={isDark ? 'text-white' : 'text-gray-900'}>Theme & Editor Preferences:</strong> Local storage flags to remember your dark/light mode preference and editor keybindings.
            </li>
          </ul>
        </div>
      )
    },
    {
      id: 'security',
      icon: <FiShield className="w-5 h-5 text-pink-400" />,
      title: '5. Security Protocols & Safeguards',
      content: (
        <div className="space-y-4">
          <p>
            We implement comprehensive technical and organizational measures to protect your account and real-time communications:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Strict Transport Security (HSTS) and modern TLS 1.3 encryption across all HTTPS endpoints and WSS WebSocket gateways.</li>
            <li>Cryptographic password hashing using industry standard bcrypt rounds with salted digests.</li>
            <li>Protected API routes with JWT token verification and CSRF mitigation.</li>
            <li>Continuous monitoring for DDoS attacks, brute-force login attempts, and socket flood anomalies.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'rights',
      icon: <FiUserCheck className="w-5 h-5 text-cyan-400" />,
      title: '6. Your Rights & Data Portability',
      content: (
        <div className="space-y-4">
          <p>
            Regardless of your geographical location, Collixy respects developer autonomy. You hold the following rights:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className={isDark ? 'text-white' : 'text-gray-900'}>Access:</strong> You can request a summary of the personal information stored in your Collixy profile.</li>
            <li><strong className={isDark ? 'text-white' : 'text-gray-900'}>Rectification:</strong> You may update or correct your profile details directly from the dashboard.</li>
            <li><strong className={isDark ? 'text-white' : 'text-gray-900'}>Erasure:</strong> You can request complete deletion of your account and associated database records at any time.</li>
            <li><strong className={isDark ? 'text-white' : 'text-gray-900'}>Portability:</strong> You can export any saved snippets or project files directly from your workspace.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'contact',
      icon: <FiMail className="w-5 h-5 text-purple-400" />,
      title: '7. Contact Us & Privacy Officer',
      content: (
        <div className="space-y-4">
          <p>
            If you have any questions, concerns, or requests regarding this Privacy Policy or our security infrastructure, please contact our team:
          </p>
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            isDark ? 'bg-gray-800/40 border-white/10' : 'bg-gray-50 border-gray-200'
          }`}>
            <div>
              <p className="font-semibold">Collixy Privacy & Security Team</p>
              <p className="text-sm opacity-80">Email: support@collixy.com</p>
              <p className="text-sm opacity-80">Location: Mumbai, Maharashtra, India</p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                isDark 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              Contact Support
            </button>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      isDark ? 'bg-gray-900 text-gray-100' : 'bg-[#EDF1FE] text-gray-800'
    }`}>
      {/* Navbar */}
      <Navbar onLoginClick={() => navigate('/login')} />

      {/* Main Content */}
      <main className="grow pt-32 sm:pt-36 md:pt-40 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 lg:px-12">
          
          {/* Header Banner */}
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase mb-4 border ${
              isDark 
                ? 'bg-blue-950/60 text-blue-300 border-blue-800/50' 
                : 'bg-blue-100/70 text-blue-700 border-blue-300/60'
            }`}>
              <FiShield className="w-3.5 h-3.5" />
              <span>Developer Privacy & Security</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              Privacy <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-500 via-indigo-500 to-purple-500">Policy</span>
            </h1>

            <p className={`text-base sm:text-lg leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Your code and thoughts are your intellectual property. Collixy is built with strict privacy guarantees, ephemeral session destruction, and zero code harvesting.
            </p>

            <div className="flex items-center justify-center gap-2 mt-4 text-xs sm:text-sm opacity-70">
              <FiClock className="w-4 h-4" />
              <span>Last updated: October 2026 • Effective immediately</span>
            </div>
          </div>

          {/* Core Privacy Pillars Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
            {corePillars.map((pillar, idx) => (
              <div 
                key={idx}
                className={`p-5 rounded-2xl border backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 ${
                  isDark 
                    ? 'bg-gray-800/40 border-white/10 hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/10' 
                    : 'bg-white/70 border-white/60 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  isDark ? 'bg-gray-700/60' : 'bg-blue-50'
                }`}>
                  {pillar.icon}
                </div>
                <h3 className={`font-bold text-base mb-1.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {pillar.title}
                </h3>
                <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {pillar.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Policy Sections Cards */}
          <div className="space-y-8">
            {sections.map((section) => (
              <section 
                key={section.id}
                id={section.id}
                className={`p-6 sm:p-8 rounded-2xl border transition-all duration-300 ${
                  isDark 
                    ? 'bg-gray-800/30 border-white/10 hover:border-white/20' 
                    : 'bg-white/80 border-black/5 hover:border-blue-200 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200/20">
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-blue-50'}`}>
                    {section.icon}
                  </div>
                  <h2 className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {section.title}
                  </h2>
                </div>

                <div className={`text-sm sm:text-base leading-relaxed ${
                  isDark ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {section.content}
                </div>
              </section>
            ))}
          </div>

          {/* Bottom Security Banner */}
          <div className={`mt-16 p-8 rounded-3xl border text-center relative overflow-hidden ${
            isDark 
              ? 'bg-linear-to-r from-blue-900/30 via-indigo-900/30 to-purple-900/30 border-blue-500/20' 
              : 'bg-linear-to-r from-blue-100/60 via-indigo-100/60 to-purple-100/60 border-blue-300/40'
          }`}>
            <h3 className={`text-2xl sm:text-3xl font-extrabold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Experience Private & Secure Collaboration
            </h3>
            <p className={`max-w-xl mx-auto text-sm sm:text-base mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Host a live pair-programming room with full confidence that your code remains yours, always.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-white bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25 transition-all hover:scale-105 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Get Started Now</span>
                <FiArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/')}
                className={`w-full sm:w-auto px-6 py-3 rounded-xl font-semibold transition-all cursor-pointer border ${
                  isDark 
                    ? 'border-white/20 hover:bg-white/10 text-white' 
                    : 'border-gray-300 hover:bg-white text-gray-800'
                }`}
              >
                Back to Home
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
