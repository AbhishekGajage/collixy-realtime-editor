// src/pages/SessionDetail.jsx - Full session detail view with decrypted code
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../Context/userContext.jsx';
import { useTheme } from '../Context/useTheme';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { sessionsAPI } from '../services/api';
import { Editor } from '@monaco-editor/react';
import {
  FiArrowLeft,
  FiClock,
  FiCode,
  FiUsers,
  FiUser,
  FiCalendar,
  FiHash,
  FiCopy,
  FiLock,
  FiRefreshCw,
  FiLogIn,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const SessionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useUser();
  const { theme } = useTheme();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }
    if (!id) return;

    const fetchSession = async () => {
      try {
        setLoading(true);
        const res = await sessionsAPI.getSessionById(id);
        if (res.data.success) {
          setSession(res.data.data);
        } else {
          setError(res.data.message || 'Failed to load session');
        }
      } catch (err) {
        console.error('Failed to fetch session:', err);
        setError(
          err.response?.data?.message ||
            'Failed to load session details. You may not have access.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [id, user, authLoading, navigate]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (ms) => {
    if (!ms) return '-';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const copyCode = () => {
    if (session?.code) {
      navigator.clipboard.writeText(session.code);
      toast.success('Code copied to clipboard!');
    }
  };

  const handleReopenRoom = () => {
    if (!session?.roomId) return;
    sessionStorage.setItem('collixy_activeRoomId', session.roomId);
    sessionStorage.setItem('collixy_activeRoomRole', 'host');
    navigate('/dashboard/room/create', {
      state: {
        reopenRoomId: session.roomId,
        savedCode: session.code || '',
        savedLanguage: session.language || 'javascript',
      },
    });
  };

  const handleRejoinRoom = () => {
    if (!session?.roomId) return;
    sessionStorage.setItem('collixy_activeRoomId', session.roomId);
    sessionStorage.setItem('collixy_activeRoomRole', 'participant');
    navigate(`/room/${session.roomId}`);
  };

  const isDark = theme === 'dark';

  if (authLoading || loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
          isDark ? 'bg-gray-900' : 'bg-[#EDF1FE]'
        }`}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Loading session details...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`min-h-screen flex flex-col transition-colors duration-300 ${
          isDark ? 'bg-gray-900' : 'bg-[#EDF1FE]'
        }`}
      >
        <Navbar />
        <main className="grow pt-28 sm:pt-32 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div
              className={`flex justify-center mb-6 ${isDark ? 'text-gray-600' : 'text-gray-300'}`}
            >
              <FiLock className="w-16 h-16" />
            </div>
            <h2
              className={`text-2xl font-bold mb-4 ${
                isDark ? 'text-white' : 'text-gray-800'
              }`}
            >
              Access Denied
            </h2>
            <p className={`mb-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {error}
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium cursor-pointer"
            >
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!session) return null;

  const languageMap = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    python: 'Python',
    java: 'Java',
    cpp: 'C++',
    c: 'C',
    go: 'Go',
    rust: 'Rust',
    php: 'PHP',
    ruby: 'Ruby',
    csharp: 'C#',
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-300 ${
        isDark ? 'bg-gray-900' : 'bg-[#EDF1FE]'
      }`}
    >
      <Navbar />

      <main className="grow pt-28 sm:pt-32 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button
            onClick={() => navigate('/dashboard')}
            className={`
              flex items-center gap-2 mb-8
              text-sm font-medium
              transition-colors duration-200
              cursor-pointer
              ${
                isDark
                  ? 'text-gray-400 hover:text-white'
                  : 'text-gray-500 hover:text-gray-800'
              }
            `}
          >
            <FiArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          {/* Session Header */}
          <div
            className={`
              rounded-2xl p-6 sm:p-8 mb-8
              border backdrop-blur-sm
              ${
                isDark
                  ? 'bg-gray-800/60 border-gray-700/50'
                  : 'bg-white/80 border-gray-200/50'
              }
            `}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className={`
                      inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider
                      ${
                        session.role === 'host'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }
                    `}
                  >
                    {session.role === 'host' ? 'Host' : 'Participant'}
                  </span>
                  <span
                    className={`
                      inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
                      ${
                        session.status === 'active'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }
                    `}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        session.status === 'active'
                          ? 'bg-green-400 animate-pulse'
                          : 'bg-gray-400'
                      }`}
                    />
                    {session.status === 'active' ? 'Live' : 'Closed'}
                  </span>
                </div>
                <h1
                  className={`text-2xl sm:text-3xl font-bold ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  Session Details
                </h1>
              </div>
              <div className="flex items-center gap-2">
                {session.role === 'host' ? (
                  <button
                    onClick={handleReopenRoom}
                    className="flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl shadow-lg shadow-amber-500/25 transition-all font-medium text-sm cursor-pointer"
                  >
                    <FiRefreshCw className="w-4 h-4" />
                    Reopen Room
                  </button>
                ) : (
                  <button
                    onClick={handleRejoinRoom}
                    className="flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl shadow-lg shadow-blue-500/25 transition-all font-medium text-sm cursor-pointer"
                  >
                    <FiLogIn className="w-4 h-4" />
                    Rejoin Room
                  </button>
                )}
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  icon: <FiHash className="w-4 h-4" />,
                  label: 'Room ID',
                  value: session.roomId.substring(0, 8) + '...',
                  full: session.roomId,
                },
                {
                  icon: <FiUser className="w-4 h-4" />,
                  label: 'Host',
                  value: session.hostUsername,
                },
                {
                  icon: <FiCode className="w-4 h-4" />,
                  label: 'Language',
                  value:
                    languageMap[session.language] || session.language,
                },
                {
                  icon: <FiUsers className="w-4 h-4" />,
                  label: 'Participants',
                  value: session.participantCount,
                },
                {
                  icon: <FiCalendar className="w-4 h-4" />,
                  label: 'Created',
                  value: formatDate(session.createdAt),
                },
                {
                  icon: <FiCalendar className="w-4 h-4" />,
                  label: 'Closed',
                  value: formatDate(session.closedAt),
                },
                {
                  icon: <FiClock className="w-4 h-4" />,
                  label: 'Duration',
                  value: formatDuration(session.duration),
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`
                    rounded-xl p-4
                    ${isDark ? 'bg-gray-700/40' : 'bg-gray-50/80'}
                  `}
                >
                  <div
                    className={`flex items-center gap-2 text-xs font-medium mb-1 ${
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </div>
                  <div
                    className={`text-sm font-semibold truncate ${
                      isDark ? 'text-gray-200' : 'text-gray-800'
                    }`}
                    title={item.full || String(item.value)}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Participants */}
          <div
            className={`
              rounded-2xl p-6 sm:p-8 mb-8
              border backdrop-blur-sm
              ${
                isDark
                  ? 'bg-gray-800/60 border-gray-700/50'
                  : 'bg-white/80 border-gray-200/50'
              }
            `}
          >
            <h2
              className={`text-lg font-bold mb-4 flex items-center gap-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              <FiUsers className="w-5 h-5" />
              Participants ({session.participantCount})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {session.participants.map((p, i) => (
                <div
                  key={i}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl
                    ${isDark ? 'bg-gray-700/40' : 'bg-gray-50/80'}
                  `}
                >
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      text-sm font-bold
                      ${
                        p.username === session.hostUsername
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                          : 'bg-gradient-to-br from-blue-400 to-purple-500 text-white'
                      }
                    `}
                  >
                    {p.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm font-semibold truncate ${
                        isDark ? 'text-gray-200' : 'text-gray-800'
                      }`}
                    >
                      {p.username}
                      {p.username === session.hostUsername && (
                        <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                          Host
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-xs ${
                        isDark ? 'text-gray-400' : 'text-gray-500'
                      }`}
                    >
                      Joined {formatDate(p.joinedAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Code Snapshot */}
          <div
            className={`
              rounded-2xl overflow-hidden mb-8
              border backdrop-blur-sm
              ${
                isDark
                  ? 'bg-gray-800/60 border-gray-700/50'
                  : 'bg-white/80 border-gray-200/50'
              }
            `}
          >
            <div className="flex items-center justify-between p-6 pb-0">
              <h2
                className={`text-lg font-bold flex items-center gap-2 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}
              >
                <FiCode className="w-5 h-5" />
                Code Snapshot
              </h2>
              <button
                onClick={copyCode}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                  transition-colors cursor-pointer
                  ${
                    isDark
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                <FiCopy className="w-4 h-4" />
                Copy Code
              </button>
            </div>
            <div className="p-6 pt-4">
              {session.code ? (
                <div className="rounded-xl overflow-hidden border border-gray-700/30">
                  <Editor
                    height="500px"
                    language={session.language || 'javascript'}
                    value={session.code}
                    theme={isDark ? 'vs-dark' : 'light'}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                      padding: { top: 16 },
                    }}
                  />
                </div>
              ) : (
                <div
                  className={`
                    text-center py-16 rounded-xl
                    ${isDark ? 'bg-gray-700/30 text-gray-400' : 'bg-gray-50 text-gray-500'}
                  `}
                >
                  <FiCode className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">No code snapshot available</p>
                  <p className="text-sm mt-1 opacity-70">
                    Code is saved when the host closes the room
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SessionDetail;
