// components/CreateRoom.jsx - COMPLETE FIXED VERSION
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidV4 } from "uuid";
import { toast } from "react-hot-toast";
import { Editor } from "@monaco-editor/react";
import Avatar from "react-avatar";

// Icons
import { 
  FiHome, 
  FiLogOut, 
  FiCopy, 
  FiUsers, 
  FiGlobe,
  FiCode,
  FiTerminal,
  FiChevronLeft,
  FiChevronRight,
  FiShare2,
  FiMessageSquare
} from "react-icons/fi";

// Components
import LanguageSelector from "../components/LanguageSelector";
import Output from "../components/Output";
import { CODE_SNIPPETS } from "../utils/constants";

// Socket
import { initSocket } from "../services/socket";
import ACTIONS from "../utils/Actions";

// Import user context
import { useUser } from '../Context/userContext';

const CreateRoom = () => {
  const navigate = useNavigate();
  const { user, logout } = useUser();
  
  const socketRef = useRef(null);
  const editorRef = useRef(null);
  const codeRef = useRef("");
  const isReceivingRemoteChange = useRef(false);
  const debounceTimerRef = useRef(null);

  // State
  const [roomId, setRoomId] = useState("");
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Editor state
  const [value, setValue] = useState(() => CODE_SNIPPETS.javascript);
  const [language, setLanguage] = useState("javascript");
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showChat, setShowChat] = useState(false);

  // Initialize room ID
  useEffect(() => {
    const id = uuidV4();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoomId(id);
    console.log(`🏗️ Generated room ID: ${id}`);
  }, []);

  // Initialize socket connection
// Initialize socket connection
useEffect(() => {
  if (!roomId || !user) {
    if (!user) {
      navigate('/login', { 
        state: { 
          from: '/dashboard/room/create', 
          message: 'Please login to create a room' 
        } 
      });
    }
    return;
  }

  // `cancelled` + a local `socket` handle are what make this safe under
  // React StrictMode. The effect body is async, so on the first (discarded)
  // mount the cleanup used to run while socketRef.current was still undefined
  // — disconnect() was a no-op and we leaked a second live socket. The server
  // then rejected the duplicate CREATE_ROOM with "Room already exists", and
  // socketRef.current ended up pointing at the socket that was NOT in the room,
  // so the creator never received USER_JOINED / CODE_UPDATED broadcasts.
  let cancelled = false;
  let socket = null;
  let watchdogId = null;

  const initSocketConnection = async () => {
  setIsLoading(true);
  try {
    console.log('🔍 CREATE ROOM - STARTING INIT SOCKET CONNECTION');
    console.log('Room ID to create:', roomId);
    console.log('User:', user?.username || 'Anonymous');
    console.log('Is user logged in?', !!user);

    socket = await initSocket();

    // The effect was torn down while we were awaiting the connection.
    if (cancelled) {
      console.log('🧹 Effect cancelled during connect — closing orphan socket');
      socket.disconnect();
      return;
    }

    socketRef.current = socket;
    const username = user.username || 'Anonymous';
    
    console.log('✅ Socket connection successful!');
    console.log('Socket ID:', socketRef.current.id);
    console.log('Socket connected?', socketRef.current.connected);

    // ========== DEBUG: Listen to ALL socket events ==========
    socketRef.current.onAny((event, ...args) => {
      console.log(`📡 [FRONTEND] Socket event received: ${event}`, args);
    });

    socketRef.current.on("connect_error", (err) => {
      console.error("❌ Socket connection error:", err);
      toast.error("Failed to connect to server");
      setIsLoading(false);
    });

    socketRef.current.on("connect_failed", (err) => {
      console.error("❌ Socket connection failed:", err);
      toast.error("Connection failed. Please refresh.");
      setIsLoading(false);
    });

    // ========== EMIT CREATE_ROOM EVENT ==========
    console.log('🚀 [FRONTEND] Emitting CREATE_ROOM event:', {
      roomId,
      username,
      eventName: ACTIONS.CREATE_ROOM
    });

    socketRef.current.emit(ACTIONS.CREATE_ROOM, {
      roomId,
      username,
      language: language // Add language parameter
    });

    // ========== LISTEN FOR ROOM_CREATED EVENT ==========
    console.log('👂 [FRONTEND] Setting up listener for ROOM_CREATED event');

    socketRef.current.on(ACTIONS.ROOM_CREATED, (data) => {
      console.log('🎉 [FRONTEND] ROOM_CREATED event received!');
      console.log('📊 Complete data received:', data);
      
      // Check if roomId matches what we sent
      if (data.roomId && data.roomId !== roomId) {
        console.log(`🔄 Room ID updated from backend: ${data.roomId}`);
        // Don't update roomId if we want to keep the UUID
      }
      
      // Create yourself as the first client
      const userClient = {
        socketId: socketRef.current.id,
        username: username,
        isHost: true
      };
      
      console.log('👤 Setting yourself as client:', userClient);
      setClients([userClient]);
      
      setIsLoading(false);
      toast.success(`Room ${data.roomId ? data.roomId.substring(0, 8) : roomId.substring(0, 8)}... created!`);
      console.log('✅ Room creation process completed successfully!');
    });

    // ========== LISTEN FOR JOINED EVENT (MAIN EVENT) ==========
    console.log('👂 [FRONTEND] Setting up listener for JOINED event');

    socketRef.current.on(ACTIONS.JOINED, (data) => {
      console.log('👤 [FRONTEND] JOINED event received:');
      console.log('   Complete data:', data);
      
      // Handle clients
      if (data.clients && Array.isArray(data.clients)) {
        const formattedClients = data.clients.map(client => ({
          socketId: client.id || client.socketId,
          username: client.username || 'Anonymous',
          isHost: client.isHost || false
        }));
        console.log('👥 Formatted clients:', formattedClients);
        setClients(formattedClients);
      }
      
      // Handle code and language from roomInfo
      if (data.roomInfo) {
        if (data.roomInfo.language) {
          console.log('🌐 Setting language from roomInfo:', data.roomInfo.language);
          setLanguage(data.roomInfo.language);
        }
      }
      
      // Also check for direct code/language in data
      if (data.code !== undefined) {
        console.log('📝 Setting code from JOINED event');
        setValue(data.code || '');
        codeRef.current = data.code || '';
      }
      
      if (data.language) {
        console.log('🌐 Setting language from JOINED event:', data.language);
        setLanguage(data.language);
      }
      
      setIsLoading(false);
      console.log('✅ JOINED event processed successfully');
    });

    // ========== LISTEN FOR USER_JOINED EVENT ==========
    console.log('👂 [FRONTEND] Setting up listener for USER_JOINED event');

    socketRef.current.on(ACTIONS.USER_JOINED, (data) => {
      console.log('👤 [FRONTEND] USER_JOINED event received:');
      console.log('   Data:', data);
      
      if (data.user && data.user.username !== username) {
        // Add the new user to clients list
        const newClient = {
          socketId: data.user.id || data.socketId,
          username: data.user.username,
          isHost: data.user.isHost || false
        };
        
        setClients(prev => {
          // Check if user already exists
          const exists = prev.some(client => client.socketId === newClient.socketId);
          if (!exists) {
            const updated = [...prev, newClient];
            console.log('👥 Updated clients after USER_JOINED:', updated);
            return updated;
          }
          return prev;
        });
        
        toast.success(`${data.user.username} joined the room!`);
        setMessages(prev => [...prev, {
          type: 'system',
          user: 'System',
          message: `${data.user.username} joined the room`,
          timestamp: new Date().toLocaleTimeString()
        }]);
      }
    });

    // ========== LISTEN FOR USER_LEFT EVENT ==========
    // The server emits USER_LEFT (handleLeave); it never emits DISCONNECTED.
    // Payload: { user: { id, username }, timestamp, totalUsers }
    socketRef.current.on(ACTIONS.USER_LEFT, (data) => {
      console.log('👋 [FRONTEND] USER_LEFT event received:', data);

      const leftUsername = data.user?.username;

      if (leftUsername && leftUsername !== username) {
        // Remove user from clients list
        setClients(prev => {
          const updated = prev.filter(client => client.username !== leftUsername);
          console.log('👥 Updated clients after USER_LEFT:', updated);
          return updated;
        });

        toast.success(`${leftUsername} left the room`);
        setMessages(prev => [...prev, {
          type: 'system',
          user: 'System',
          message: `${leftUsername} left the room`,
          timestamp: new Date().toLocaleTimeString()
        }]);
      }
    });

    // ========== LISTEN FOR CODE_UPDATED EVENT ==========
    // We EMIT code-change; the server broadcasts back on code-updated.
    socketRef.current.on(ACTIONS.CODE_UPDATED, (data) => {
      console.log('📝 [FRONTEND] CODE_UPDATED event received:', data);
      
      if (data.code !== null && data.code !== undefined && data.user !== username) {
        isReceivingRemoteChange.current = true;

        if (data.language && data.language !== language) {
          console.log('🌐 Updating language from CODE_CHANGE:', data.language);
          setLanguage(data.language);
        }

        if (editorRef.current) {
          editorRef.current.setValue(data.code);
        }
        setValue(data.code);
        codeRef.current = data.code;

        setTimeout(() => {
          isReceivingRemoteChange.current = false;
        }, 50);

        if (data.user && data.user !== username) {
          toast(`${data.user} updated the code`, {
            icon: '✏️',
            duration: 1500
          });
        }
      }
    });

    // ========== LISTEN FOR LANGUAGE_UPDATED EVENT ==========
    // We EMIT language-change; the server broadcasts back on language-updated.
    socketRef.current.on(ACTIONS.LANGUAGE_UPDATED, (data) => {
      console.log('🌐 [FRONTEND] LANGUAGE_UPDATED event received:', data);
      
      if (data.language && data.language !== language && data.user !== username) {
        setLanguage(data.language);
        toast(`${data.user} changed language to ${data.language}`, {
          icon: '🌐',
          duration: 1500
        });
      }
    });

    // ========== LISTEN FOR SYNC_CODE EVENT ==========
    socketRef.current.on(ACTIONS.SYNC_CODE, (data) => {
      console.log('🔄 [FRONTEND] SYNC_CODE event received:', data);
      
      if (data.code !== undefined) {
        isReceivingRemoteChange.current = true;
        
        if (data.language) {
          setLanguage(data.language);
        }
        
        if (editorRef.current) {
          editorRef.current.setValue(data.code);
        }
        setValue(data.code);
        codeRef.current = data.code;
        
        setTimeout(() => {
          isReceivingRemoteChange.current = false;
        }, 50);
      }
    });

    // ========== LISTEN FOR NEW_CHAT_MESSAGE EVENT ==========
    // We EMIT chat-message; the server broadcasts back on new-chat-message.
    socketRef.current.on(ACTIONS.NEW_CHAT_MESSAGE, (data) => {
      console.log('💬 [FRONTEND] NEW_CHAT_MESSAGE event received:', data);

      setMessages(prev => [...prev, {
        type: 'user',
        user: data.user || 'Anonymous',
        message: data.message,
        timestamp: data.timestamp
          ? new Date(data.timestamp).toLocaleTimeString()
          : new Date().toLocaleTimeString()
      }]);
    });

    // ========== LISTEN FOR ERROR EVENT ==========
    socketRef.current.on(ACTIONS.ERROR, (data) => {
      console.error('❌ [FRONTEND] ERROR event received:', data);
      toast.error(data.message || 'An error occurred');
      setIsLoading(false);
    });

    // ========== LISTEN FOR ROOM_FULL EVENT ==========
    socketRef.current.on(ACTIONS.ROOM_FULL, (data) => {
      console.error('❌ [FRONTEND] ROOM_FULL event received:', data);
      toast.error(data.message || 'Room is full. Maximum capacity reached.');
      setIsLoading(false);
    });

    // ========== LISTEN FOR ROOM_NOT_FOUND EVENT ==========
    socketRef.current.on(ACTIONS.ROOM_NOT_FOUND, (data) => {
      console.error('❌ [FRONTEND] ROOM_NOT_FOUND event received:', data);
      toast.error(data.message || 'Room not found. Please check the Room ID.');
      setIsLoading(false);
    });

    // ========== TIMEOUT CHECK ==========
    watchdogId = setTimeout(() => {
      console.log('⏰ [FRONTEND] 5-second timeout check:');
      console.log('   Is socket connected?', socketRef.current?.connected);
      console.log('   Still loading?', isLoading);
      console.log('   Room ID:', roomId);
      console.log('   Socket ID:', socketRef.current?.id);
      
      if (!socketRef.current?.connected) {
        console.error('⚠️ Socket not connected after 5 seconds!');
        toast.error('Connection timeout. Please refresh.');
        setIsLoading(false);
      }
      if (isLoading) {
        console.warn('⚠️ Still loading after 5 seconds');
        // Try to get room info as fallback
        if (socketRef.current?.connected) {
          console.log('🔄 Trying to get room info as fallback...');
          socketRef.current.emit(ACTIONS.GET_ROOM_INFO, { roomId });
        }
      }
    }, 5000);

  } catch (error) {
    console.error("❌ [FRONTEND] Socket initialization error:", error);
    toast.error("Failed to initialize connection");
    setIsLoading(false);
  }
};

  initSocketConnection();

  return () => {
    cancelled = true;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (watchdogId) {
      clearTimeout(watchdogId);
    }
    // Use the local handle: socketRef.current may not be assigned yet.
    if (socket) {
      socket.disconnect();
    }
    socketRef.current = null;
  };
}, [roomId, user, navigate]);

  // Handle code changes with debounce
  const handleCodeChange = useCallback((newValue) => {
    const newCode = newValue || "";
    
    if (!isReceivingRemoteChange.current) {
      setValue(newCode);
      codeRef.current = newCode;
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(() => {
        if (socketRef.current && user) {
          socketRef.current.emit(ACTIONS.CODE_CHANGE, {
            roomId,
            code: newCode,
            language,
            user: user.username || 'Anonymous'
          });
        }
      }, 300);
    }
  }, [roomId, user, language]);

  // Handle language selection
  const handleLanguageSelect = useCallback((selectedLanguage) => {
    setLanguage(selectedLanguage);
    
    const newCode = CODE_SNIPPETS[selectedLanguage] || "";
    setValue(newCode);
    codeRef.current = newCode;
    
    if (socketRef.current && user) {
      socketRef.current.emit(ACTIONS.CODE_CHANGE, {
        roomId,
        code: newCode,
        language: selectedLanguage,
        user: user.username || 'Anonymous'
      });
      
      socketRef.current.emit(ACTIONS.LANGUAGE_CHANGE, {
        roomId,
        language: selectedLanguage,
        user: user.username || 'Anonymous'
      });
    }
  }, [roomId, user]);

  // Handle editor mount
  const onEditorMount = (editor) => {
    editorRef.current = editor;
    editor.focus();
    
    editor.updateOptions({
      automaticLayout: true,
      scrollBeyondLastLine: false,
      minimap: { enabled: true },
    });
  };

  // The joinable invite URL for this room. window.location.href would be
  // /dashboard/room/create — sending that to a friend makes them create their
  // OWN room instead of joining this one.
  const inviteUrl = roomId ? `${window.location.origin}/room/${roomId}` : '';

  // Copy room ID to clipboard
  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success('Room ID copied to clipboard!', {
        duration: 3000,
        icon: '📋',
      });
    } catch (err) {
      toast.error('Failed to copy Room ID');
      console.error(err);
    }
  };

  // Copy the full invite link
  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Invite link copied — send it to your collaborator!', {
        duration: 3000,
        icon: '🔗',
      });
    } catch (err) {
      toast.error('Failed to copy invite link');
      console.error(err);
    }
  };

  // Share room
  const shareRoom = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Join my collaborative coding room',
          text: `Join me in this real-time code editor! Room ID: ${roomId}`,
          url: inviteUrl,
        });
      } else {
        await copyInviteLink();
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  // Navigate to home
  const goToHome = () => {
    navigate("/dashboard");
  };

  // Send chat message
  const sendMessage = () => {
    if (!newMessage.trim() || !user) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const messageData = {
      type: 'user',
      user: user.username || 'Anonymous',
      message: newMessage,
      timestamp
    };
    
    setMessages(prev => [...prev, messageData]);
    
    if (socketRef.current) {
      socketRef.current.emit(ACTIONS.CHAT_MESSAGE, {
        roomId,
        user: user.username || 'Anonymous',
        message: newMessage,
        timestamp
      });
    }
    
    setNewMessage("");
  };

  // Handle logout
  const handleLogout = () => {
    if (socketRef.current && user) {
      socketRef.current.emit(ACTIONS.LEAVE, { 
        roomId, 
        username: user.username || 'Anonymous' 
      });
    }
    logout();
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-linear-to-br from-gray-900 to-black">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-300">Creating collaborative room...</p>
          <p className="mt-2 text-sm text-gray-400">Room ID: {roomId.substring(0, 12)}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className={`flex flex-col bg-gray-800 border-r border-gray-700 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        
        {/* Top Logo Section */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-indigo-600 rounded-lg">
              <FiCode className="w-6 h-6" />
            </div>
            {!sidebarCollapsed && (
              <>
                <h1 className="text-xl font-bold">Collixy</h1>
              </>
            )}
          </div>
          {!sidebarCollapsed && (
            <p className="mt-2 text-sm text-gray-400">Collaborative Editor</p>
          )}
        </div>

        {/* Room Info Section */}
        {!sidebarCollapsed && (
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center mb-3">
              <FiGlobe className="w-4 h-4 mr-2 text-indigo-400" />
              <span className="font-medium text-sm">Room Info</span>
            </div>
            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-1">Room ID (Share with friends)</div>
              <div className="flex items-center space-x-2">
                <code className="flex-1 px-2 py-1.5 bg-gray-900 rounded text-xs font-mono truncate border border-indigo-500">
                  {roomId}
                </code>
                <button
                  onClick={copyRoomId}
                  className="p-1.5 bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
                  title="Copy Room ID to share"
                >
                  <FiCopy className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Share this ID with friends so they can join
              </p>
            </div>
            <div className="mb-3">
              <div className="text-xs text-gray-400 mb-1">Invite link</div>
              <div className="flex items-center space-x-2">
                <code className="flex-1 px-2 py-1.5 bg-gray-900 rounded text-xs font-mono truncate border border-gray-700">
                  {inviteUrl}
                </code>
                <button
                  onClick={copyInviteLink}
                  className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                  title="Copy the invite link"
                >
                  <FiCopy className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Opens straight into this room — no ID to paste
              </p>
            </div>
            <button
              onClick={shareRoom}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors text-sm"
            >
              <FiShare2 className="w-3.5 h-3.5" />
              <span>Invite</span>
            </button>
          </div>
        )}

        {/* Connected Users Section */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="flex items-center mb-4">
            <FiUsers className="w-4 h-4 mr-2 text-green-400" />
            {!sidebarCollapsed && (
              <span className="font-medium text-sm">
                Users ({clients?.length || 0})
              </span>
            )}
          </div>
          <div className="space-y-2">
            {clients && clients.length > 0 ? (
              clients.map((client) => (
                <div key={client.socketId} className="flex items-center space-x-2">
                  <div className="relative">
                    <Avatar 
                      name={client.username} 
                      size={sidebarCollapsed ? "28" : "32"} 
                      round="6px" 
                      className="border border-indigo-500"
                    />
                    <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border border-gray-800 rounded-full"></div>
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex-1">
                      <div className="font-medium text-sm truncate">{client.username}</div>
                      <div className="text-xs text-gray-400">Online</div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              !sidebarCollapsed && (
                <div className="text-center text-gray-500 py-2">
                  <FiUsers className="w-6 h-6 mx-auto mb-1 opacity-50" />
                  <p className="text-xs">Waiting for users to join...</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Chat Section */}
        {showChat && !sidebarCollapsed && (
          <div className="border-t border-gray-700">
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <FiMessageSquare className="w-4 h-4 mr-2 text-indigo-400" />
                  <span className="font-medium text-sm">Chat</span>
                </div>
                <button
                  onClick={() => setShowChat(false)}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  ×
                </button>
              </div>
              <div className="h-32 overflow-y-auto mb-2 space-y-1">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`p-1.5 rounded text-xs ${msg.type === 'system' ? 'bg-gray-900 text-gray-400' : 'bg-gray-800'}`}>
                    <div className="flex justify-between">
                      <span className={`font-medium truncate ${msg.type === 'system' ? 'text-indigo-300' : 'text-green-300'}`}>
                        {msg.user}
                      </span>
                      <span className="text-xs text-gray-500">{msg.timestamp}</span>
                    </div>
                    <div className="truncate">{msg.message}</div>
                  </div>
                ))}
              </div>
              <div className="flex space-x-1">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type..."
                  className="flex-1 px-2 py-1.5 bg-gray-900 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  onClick={sendMessage}
                  className="px-2 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded transition-colors text-xs"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Profile */}
        <div className="p-3 border-t border-gray-700">
          <div className="flex items-center space-x-2">
            {user && (
              <>
                <div className="w-10 h-10 rounded-full border border-blue-500 overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white font-medium text-base">
                    {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                  </div>
                </div>
                {!sidebarCollapsed && (
                  <div className="flex-1">
                    <div className="font-medium text-sm truncate">{user.username || 'User'}</div>
                    <div className="text-xs text-green-400">● Online</div>
                    <div className="text-xs text-gray-400 truncate">
                      Host • {roomId.substring(0, 6)}...
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Toggle Chat Button */}
          {!sidebarCollapsed && (
            <button
              onClick={() => setShowChat(!showChat)}
              className="w-full mt-3 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded transition-colors flex items-center justify-center text-sm"
            >
              <FiMessageSquare className="w-3.5 h-3.5 mr-1.5" />
              {showChat ? 'Hide Chat' : 'Chat'}
            </button>
          )}
          
          {/* Action Buttons */}
          <div className={`mt-3 flex ${sidebarCollapsed ? 'flex-col space-y-1.5' : 'space-x-1.5'}`}>
            <button
              onClick={goToHome}
              className={`flex items-center justify-center ${sidebarCollapsed ? 'p-1.5' : 'flex-1 px-3 py-1.5'} bg-gray-700 hover:bg-gray-600 rounded transition-colors text-sm`}
              title="Dashboard"
            >
              <FiHome className="w-4 h-4" />
              {!sidebarCollapsed && <span className="ml-1.5">Home</span>}
            </button>
            <button
              onClick={handleLogout}
              className={`flex items-center justify-center ${sidebarCollapsed ? 'p-1.5' : 'flex-1 px-3 py-1.5'} bg-red-600 hover:bg-red-700 rounded transition-colors text-sm`}
              title="Logout"
            >
              <FiLogOut className="w-4 h-4" />
              {!sidebarCollapsed && <span className="ml-1.5">Exit</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 p-1.5 bg-gray-800 hover:bg-gray-700 rounded-r border border-l-0 border-gray-700 transition-all"
      >
        {sidebarCollapsed ? <FiChevronRight className="w-4 h-4" /> : <FiChevronLeft className="w-4 h-4" />}
      </button>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Editor Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <LanguageSelector language={language} onSelect={handleLanguageSelect} />
            <div className="px-2 py-1 bg-gray-900 rounded">
              <span className="text-xs text-gray-300">
                {language.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={shareRoom}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded transition-colors text-sm"
            >
              <FiShare2 className="w-3.5 h-3.5" />
              <span>Share Room</span>
            </button>
            <div className="text-xs text-gray-400">
              <span className="text-green-400">●</span> {clients?.length || 0} online
            </div>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Code Editor */}
          <div className="w-[70%] overflow-hidden">
            <Editor
              options={{
                minimap: { enabled: true },
                fontSize: 13,
                wordWrap: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                lineNumbers: "on",
                renderLineHighlight: "all",
                cursorBlinking: "smooth",
                scrollbar: {
                  vertical: "visible",
                  horizontal: "visible",
                },
                readOnly: false,
              }}
              height="100%"
              theme="vs-dark"
              language={language}
              onMount={onEditorMount}
              value={value}
              onChange={handleCodeChange}
            />
          </div>

          {/* Output Panel */}
          <div className="w-[30%] border-l border-gray-700 bg-gray-900 overflow-hidden flex flex-col">
            {/* Output Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center space-x-2">
                <FiTerminal className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium">Output</span>
              </div>
            </div>
            
            {/* Output Content */}
            <div className="flex-1 overflow-auto p-3">
              <Output editorRef={editorRef} language={language} />
            </div>
            
            {/* Output Footer */}
            <div className="px-3 py-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>Language: {language}</span>
                <span>Users: {clients?.length || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateRoom;