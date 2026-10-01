// src/pages/TermsOfService.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { useTheme } from '../Context/useTheme';
import { 
  FiFileText, 
  FiCheckCircle, 
  FiAlertTriangle, 
  FiShield, 
  FiTerminal, 
  FiUsers, 
  FiCpu, 
  FiClock,
  FiArrowRight,
  FiHelpCircle
} from 'react-icons/fi';

const TermsOfService = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const corePillars = [
    {
      icon: <FiShield className="w-6 h-6 text-emerald-400" />,
      title: 'Your Code, Your IP',
      desc: 'You retain 100% intellectual property ownership of all source code authored or shared on Collixy.'
    },
    {
      icon: <FiTerminal className="w-6 h-6 text-blue-400" />,
      title: 'Sandboxed Compilation',
      desc: 'Compiler access is provided for legitimate testing; malicious execution or mining is strictly forbidden.'
    },
    {
      icon: <FiUsers className="w-6 h-6 text-purple-400" />,
      title: 'Host Room Governance',
      desc: 'Room creators control participant admissions, room lifecycle, and session termination authority.'
    },
    {
      icon: <FiCpu className="w-6 h-6 text-pink-400" />,
      title: 'Fair Resource Usage',
      desc: 'Compute, memory, and WebSocket bandwidth limits apply to maintain high availability for all peers.'
    }
  ];

  const sections = [
    {
      id: 'acceptance',
      icon: <FiCheckCircle className="w-5 h-5 text-emerald-400" />,
      title: '1. Acceptance of Terms',
      content: (
        <div className="space-y-4">
          <p>
            By accessing or using Collixy ("the Platform", "we", "us", or "our"), including creating rooms, joining collaborative sessions, compiling code, or registering an account, you agree to be bound by these Terms of Service ("Terms") and our <span onClick={() => navigate('/privacy')} className="text-blue-500 hover:underline cursor-pointer">Privacy Policy</span>.
          </p>
          <p>
            If you are using Collixy on behalf of an organization, enterprise, or educational institution, you represent and warrant that you have full legal authority to bind that entity to these Terms. If you do not agree to these terms, you must discontinue use of the platform immediately.
          </p>
        </div>
      )
    },
    {
      id: 'accounts',
      icon: <FiUsers className="w-5 h-5 text-blue-400" />,
      title: '2. User Accounts & Identity',
      content: (
        <div className="space-y-4">
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className={isDark ? 'text-white' : 'text-gray-900'}>Credential Confidentiality:</strong> You are responsible for safeguarding your authentication credentials, session tokens, and passwords. You agree to notify us immediately of any unauthorized access or security breach.
            </li>
            <li>
              <strong className={isDark ? 'text-white' : 'text-gray-900'}>Accurate Information:</strong> You agree to provide truthful and accurate information when registering or connecting third-party OAuth providers (e.g., GitHub).
            </li>
            <li>
              <strong className={isDark ? 'text-white' : 'text-gray-900'}>Account Responsibility:</strong> You are liable for all actions conducted through your account or within rooms created under your identity.
            </li>
          </ul>
        </div>
      )
    },
    {
      id: 'sandboxes',
      icon: <FiTerminal className="w-5 h-5 text-amber-400" />,
      title: '3. Acceptable Use & Sandboxed Compilation',
      content: (
        <div className="space-y-4">
          <p>
            Collixy provides integrated remote compilation and code execution environments. To ensure platform stability and safety, you agree NOT to use the execution engine for:
          </p>
          <div className={`p-4 rounded-xl border ${
            isDark ? 'bg-red-950/20 border-red-800/40 text-red-200' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <FiAlertTriangle className="text-red-500 w-5 h-5" /> Prohibited Execution Activities
            </h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Cryptocurrency mining or background distributed compute farms.</li>
              <li>Launching denial-of-service (DDoS) attacks, port scanning, or malicious network probes.</li>
              <li>Attempting container breakouts, privilege escalation, or host filesystem tampering.</li>
              <li>Distributing viruses, malware, keyloggers, worms, or trojans.</li>
              <li>Bypassing CPU execution timeouts, memory ceilings, or socket connection throttling.</li>
            </ul>
          </div>
          <p className="text-sm">
            Violation of these rules will result in immediate room termination, IP throttling, and permanent revocation of account privileges without prior warning.
          </p>
        </div>
      )
    },
    {
      id: 'ip',
      icon: <FiShield className="w-5 h-5 text-purple-400" />,
      title: '4. Intellectual Property & Code Ownership',
      content: (
        <div className="space-y-4">
          <p>
            <strong className={isDark ? 'text-white' : 'text-gray-900'}>Your Code is Yours:</strong> Collixy does not claim any ownership rights over source code, text, comments, or data you author, paste, or execute in collaboration sessions.
          </p>
          <p>
            <strong className={isDark ? 'text-white' : 'text-gray-900'}>Limited Operational License:</strong> Solely to provide our real-time synchronization, WebSocket broadcasting, and sandboxed compilation services, you grant Collixy a non-exclusive, royalty-free license to transmit, temporarily buffer in RAM, and execute your code during active sessions.
          </p>
          <p>
            <strong className={isDark ? 'text-white' : 'text-gray-900'}>No AI Training:</strong> As affirmed in our Privacy Policy, Collixy will never use your private code to train internal or commercial machine learning models.
          </p>
        </div>
      )
    },
    {
      id: 'lifecycle',
      icon: <FiClock className="w-5 h-5 text-cyan-400" />,
      title: '5. Room Lifecycle & Ephemeral Storage',
      content: (
        <div className="space-y-4">
          <p>
            Collixy operates on an ephemeral architecture designed for low-latency collaboration:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className={isDark ? 'text-white' : 'text-gray-900'}>Host-Centric Lifetime:</strong> When a room host leaves or closes the editor window, the session terminates. Code buffers in memory are purged. Participants are automatically redirected.
            </li>
            <li>
              <strong className={isDark ? 'text-white' : 'text-gray-900'}>No Archival Guarantee:</strong> While Collixy ensures smooth delta synchronizations during active sessions, you are responsible for maintaining local copies or Git commits of critical work. Collixy is not liable for data lost upon room closure.
            </li>
          </ul>
        </div>
      )
    },
    {
      id: 'disclaimer',
      icon: <FiAlertTriangle className="w-5 h-5 text-pink-400" />,
      title: '6. Service Availability & Disclaimers',
      content: (
        <div className="space-y-4">
          <p>
            Collixy is provided on an "AS IS" and "AS AVAILABLE" basis. While we strive for 99.9% uptime, we make no warranties, express or implied, regarding:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Uninterrupted or error-free WebSocket connectivity during high network congestion.</li>
            <li>Zero latency under volatile local ISP connections.</li>
            <li>The total security or fitness for specific enterprise compliance standards without dedicated contractual agreements.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'limitation',
      icon: <FiFileText className="w-5 h-5 text-indigo-400" />,
      title: '7. Limitation of Liability',
      content: (
        <div className="space-y-4">
          <p>
            To the maximum extent permitted by applicable law, Collixy and its maintainers shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, goodwill, or work interruption, arising from your use or inability to use the platform.
          </p>
        </div>
      )
    },
    {
      id: 'modifications',
      icon: <FiHelpCircle className="w-5 h-5 text-amber-400" />,
      title: '8. Amendments & Contact',
      content: (
        <div className="space-y-4">
          <p>
            We may revise these Terms of Service periodically to reflect infrastructure enhancements, security protocols, or legal requirements. Material updates will be highlighted via site notices. Continued use of Collixy following posted changes constitutes full acceptance.
          </p>
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            isDark ? 'bg-gray-800/40 border-white/10' : 'bg-gray-50 border-gray-200'
          }`}>
            <div>
              <p className="font-semibold">Legal & Compliance Team</p>
              <p className="text-sm opacity-80">Email: legal@collixy.com</p>
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
                ? 'bg-purple-950/60 text-purple-300 border-purple-800/50' 
                : 'bg-purple-100/70 text-purple-700 border-purple-300/60'
            }`}>
              <FiFileText className="w-3.5 h-3.5" />
              <span>Platform Agreement</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              Terms of <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-500 via-indigo-500 to-blue-500">Service</span>
            </h1>

            <p className={`text-base sm:text-lg leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Please read these terms carefully before creating collaborative rooms or running compiled scripts. We believe in developer autonomy, transparent rules, and mutual respect.
            </p>

            <div className="flex items-center justify-center gap-2 mt-4 text-xs sm:text-sm opacity-70">
              <FiClock className="w-4 h-4" />
              <span>Last updated: October 2026 • Version 2.4</span>
            </div>
          </div>

          {/* Core Pillars Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
            {corePillars.map((pillar, idx) => (
              <div 
                key={idx}
                className={`p-5 rounded-2xl border backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 ${
                  isDark 
                    ? 'bg-gray-800/40 border-white/10 hover:border-purple-500/40 hover:shadow-xl hover:shadow-purple-500/10' 
                    : 'bg-white/70 border-white/60 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/5'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  isDark ? 'bg-gray-700/60' : 'bg-purple-50'
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

          {/* Terms Sections Cards */}
          <div className="space-y-8">
            {sections.map((section) => (
              <section 
                key={section.id}
                id={section.id}
                className={`p-6 sm:p-8 rounded-2xl border transition-all duration-300 ${
                  isDark 
                    ? 'bg-gray-800/30 border-white/10 hover:border-white/20' 
                    : 'bg-white/80 border-black/5 hover:border-purple-200 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200/20">
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-purple-50'}`}>
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

          {/* Bottom Call to Action */}
          <div className={`mt-16 p-8 rounded-3xl border text-center relative overflow-hidden ${
            isDark 
              ? 'bg-linear-to-r from-purple-900/30 via-indigo-900/30 to-blue-900/30 border-purple-500/20' 
              : 'bg-linear-to-r from-purple-100/60 via-indigo-100/60 to-blue-100/60 border-purple-300/40'
          }`}>
            <h3 className={`text-2xl sm:text-3xl font-extrabold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Ready to Collaborate with Confidence?
            </h3>
            <p className={`max-w-xl mx-auto text-sm sm:text-base mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Launch a live pair-programming room with full protection, sandboxed security, and complete ownership of your work.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-white bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/25 transition-all hover:scale-105 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Start Coding Now</span>
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

export default TermsOfService;
