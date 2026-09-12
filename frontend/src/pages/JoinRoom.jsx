// components/JoinRoom.jsx - COMPLETE FIXED VERSION
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Editor } from "@monaco-editor/react";
import Avatar from "react-avatar";

// Icons
import {
  FiLogOut,
  FiCopy,
  FiUsers,
  FiPlay,
  FiGlobe,
  FiCode,
  FiTerminal,
  FiChevronLeft,
  FiChevronRight,
  FiShare2,
  FiMessageSquare,
  FiArrowLeft,
  FiKey,
} from "react-icons/fi";

// Components
import LanguageSelector from "../components/LanguageSelector";
import Output from "../components/Output";
import { CODE_SNIPPETS } from "../utils/constants";

// Socket
import { initSocket } from "../services/socket";
import ACTIONS from "../utils/Actions";

// Import user context
import { useUser } from "../Context/userContext";

// Room IDs are matched with an exact Map key lookup on the server, so a pasted
// value carrying whitespace or a newline fails with ROOM_NOT_FOUND. Normalize
// once, here, and use the result everywhere.
const normalizeRoomId = (raw) => (raw || "").trim();

const JoinRoom = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId: roomIdParam } = useParams();
  const { user, logout } = useUser();

  // Refs
  const socketRef = useRef(null);
  const editorRef = useRef(null);
  const codeRef = useRef("");
  const isReceivingRemoteChange = useRef(false);
  const debounceTimerRef = useRef(null);
  const languageRef = useRef("javascript"); // ADD THIS LINE - Fix for languageRef error
  const isLoadingRef = useRef(false); // Add this
  const joiningRef = useRef(false); // Add this
  const autoJoinedRef = useRef(false); // guards the one-shot auto-join

  // State
  const [roomId, setRoomId] = useState(normalizeRoomId(roomIdParam));
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [joining, setJoining] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Editor state
  const [value, setValue] = useState("");
  const [language, setLanguage] = useState("javascript");

  // Chat state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showChat, setShowChat] = useState(false);

  // Update languageRef when language changes
  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  // Check for pre-filled room ID from location state
  useEffect(() => {
    if (location.state?.roomId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRoomId(normalizeRoomId(location.state.roomId));
    }
  }, [location.state]);

  // Initialize socket connection - COMPLETE FIXED VERSION
  // Initialize socket connection - COMPLETE FIXED VERSION
  const initSocketConnection = useCallback(async () => {
    if (!roomId || !user) return;

    const username = user.username || "Anonymous";

    setIsLoading(true);
    setJoining(true);
    isLoadingRef.current = true; // Update ref
    joiningRef.current = true; // Update ref

    try {
      socketRef.current = await initSocket();
      const currentUsername = username; // Store locally to avoid closure issues

      socketRef.current.on("connect_error", (err) => {
        console.error("Socket connection error:", err);
        toast.error("Failed to connect to server");
        setIsLoading(false);
        setJoining(false);
        setIsConnected(false);
        isLoadingRef.current = false; // Update ref
        joiningRef.current = false; // Update ref
      });

      socketRef.current.on("connect_failed", (err) => {
        console.error("Socket connection failed:", err);
        toast.error("Connection failed. Please refresh.");
        setIsLoading(false);
        setJoining(false);
        setIsConnected(false);
        isLoadingRef.current = false; // Update ref
        joiningRef.current = false; // Update ref
      });

      // Handle room not found
      socketRef.current.on(ACTIONS.ROOM_NOT_FOUND, () => {
        toast.error("Room not found. Please check the Room ID.");
        setIsLoading(false);
        setJoining(false);
        setIsConnected(false);
        isLoadingRef.current = false; // Update ref
        joiningRef.current = false; // Update ref
      });

      // Handle room full
      socketRef.current.on(ACTIONS.ROOM_FULL, () => {
        toast.error("Room is full. Maximum capacity reached.");
        setIsLoading(false);
        setJoining(false);
        setIsConnected(false);
        isLoadingRef.current = false; // Update ref
        joiningRef.current = false; // Update ref
      });

      // ========== LISTEN FOR JOINED EVENT ==========
      // JOINED is the server's ack to *us*, payload:
      //   { roomId, user, clients, roomInfo: { language, totalUsers, ... } }
      // The room's current code arrives separately via SYNC_CODE, so don't
      // look for a `code` field here.
      socketRef.current.on(
        ACTIONS.JOINED,
        ({ clients: joinedClients, user: joinedUserObj, roomInfo }) => {
          console.log("✅ Joined room:", {
            joinedClients,
            joinedUserObj,
            currentUsername,
            roomInfo,
          });

          // Backend users carry `id`; the roster below renders
          // key={client.socketId}, so normalize the shape.
          const SAFE_CLIENTS = (
            Array.isArray(joinedClients) ? joinedClients : []
          ).map((client) => ({
            ...client,
            socketId: client.socketId || client.id,
          }));
          setClients(SAFE_CLIENTS);

          const roomLanguage = roomInfo?.language;
          if (roomLanguage) {
            setLanguage(roomLanguage);
            languageRef.current = roomLanguage; // Update the ref too
          }

          setJoining(false);
          setIsLoading(false);
          setIsConnected(true);
          joiningRef.current = false; // Update ref
          isLoadingRef.current = false; // Update ref
          toast.success(
            `Successfully joined room ${normalizeRoomId(roomId).substring(
              0,
              8
            )}...`
          );
        }
      );

      // ========== LISTEN FOR USER_JOINED EVENT ==========
      // Server payload is { user, timestamp, totalUsers } — there is no
      // `clients` array here, so append rather than replacing the list
      // (ROOM_USERS_UPDATED is what carries the authoritative roster).
      socketRef.current.on(ACTIONS.USER_JOINED, ({ user: joinedUserObj }) => {
        const joinedUser = joinedUserObj?.username;
        console.log("👤 Another user joined:", joinedUser);
        if (joinedUser && joinedUser !== currentUsername) {
          setClients((prev) => {
            const already = prev.some(
              (c) => c.socketId === joinedUserObj.id
            );
            if (already) return prev;
            return [
              ...prev,
              {
                socketId: joinedUserObj.id,
                username: joinedUser,
                isHost: joinedUserObj.isHost || false,
              },
            ];
          });
          toast.success(`${joinedUser} joined the room!`);
          setMessages((prev) => [
            ...prev,
            {
              type: "system",
              user: "System",
              message: `${joinedUser} joined the room`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        }
      });

      // ========== EMIT JOIN EVENT ==========
      console.log("🚀 [FRONTEND-JOIN] Emitting JOIN event:", {
        roomId,
        username: currentUsername,
      });

      socketRef.current.emit(ACTIONS.JOIN, {
        roomId: normalizeRoomId(roomId),
        username: currentUsername,
      });

      // ========== LISTEN FOR USER_LEFT EVENT ==========
      // The server emits USER_LEFT ({ user: { id, username }, totalUsers })
      // to the *rest* of the room; DISCONNECTED is never broadcast.
      socketRef.current.on(ACTIONS.USER_LEFT, (data) => {
        const leftUser = data?.user?.username;
        const leftId = data?.user?.id;
        console.log("👋 User left:", leftUser);
        if (leftId) {
          setClients((prev) => prev.filter((c) => c.socketId !== leftId));
        }
        if (!leftUser) return;
        toast.success(`${leftUser} left the room`);
        setMessages((prev) => [
          ...prev,
          {
            type: "system",
            user: "System",
            message: `${leftUser} left the room`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      });

      // ========== LISTEN FOR CODE_UPDATED EVENT ==========
      // Server rebroadcasts an inbound CODE_CHANGE as CODE_UPDATED.
      socketRef.current.on(
        ACTIONS.CODE_UPDATED,
        ({ code, user: remoteUser, language: remoteLanguage }) => {
          console.log("📝 Remote code change:", {
            remoteUser,
            codeLength: code?.length,
            remoteLanguage,
          });

          if (code !== null && remoteUser !== currentUsername) {
            isReceivingRemoteChange.current = true;

            // Update language if changed - use languageRef.current
            if (remoteLanguage && remoteLanguage !== languageRef.current) {
              setLanguage(remoteLanguage);
              languageRef.current = remoteLanguage; // Update the ref
            }

            // Update code
            if (editorRef.current) {
              editorRef.current.setValue(code);
            }
            setValue(code);
            codeRef.current = code;

            setTimeout(() => {
              isReceivingRemoteChange.current = false;
            }, 50);

            if (remoteUser && remoteUser !== currentUsername) {
              toast(`${remoteUser} updated the code`, {
                icon: "✏️",
                duration: 1500,
              });
            }
          }
        }
      );

      // ========== LISTEN FOR LANGUAGE_UPDATED EVENT ==========
      // Server rebroadcasts an inbound LANGUAGE_CHANGE as LANGUAGE_UPDATED.
      socketRef.current.on(
        ACTIONS.LANGUAGE_UPDATED,
        ({ language: remoteLanguage, user: remoteUser }) => {
          console.log("🌐 Remote language change:", {
            remoteUser,
            remoteLanguage,
          });

          // Use languageRef.current instead of language
          if (
            remoteLanguage &&
            remoteLanguage !== languageRef.current &&
            remoteUser !== currentUsername
          ) {
            setLanguage(remoteLanguage);
            languageRef.current = remoteLanguage; // Update the ref
            toast(`${remoteUser} changed language to ${remoteLanguage}`, {
              icon: "🌐",
              duration: 1500,
            });
          }
        }
      );

      // ========== LISTEN FOR NEW_CHAT_MESSAGE EVENT ==========
      // Server rebroadcasts an inbound CHAT_MESSAGE as NEW_CHAT_MESSAGE, with
      // an ISO timestamp that needs formatting for display.
      socketRef.current.on(
        ACTIONS.NEW_CHAT_MESSAGE,
        ({ user: remoteUser, message, timestamp }) => {
          setMessages((prev) => [
            ...prev,
            {
              type: "user",
              user: remoteUser,
              message,
              timestamp: timestamp
                ? new Date(timestamp).toLocaleTimeString()
                : new Date().toLocaleTimeString(),
            },
          ]);
        }
      );

      // ========== LISTEN FOR SYNC_CODE EVENT ==========
      socketRef.current.on(
        ACTIONS.SYNC_CODE,
        ({ code, language: remoteLanguage }) => {
          console.log("🔄 Code sync received:", {
            codeLength: code?.length,
            remoteLanguage,
          });

          if (code) {
            isReceivingRemoteChange.current = true;

            if (remoteLanguage) {
              setLanguage(remoteLanguage);
              languageRef.current = remoteLanguage; // Update the ref
            }

            if (editorRef.current) {
              editorRef.current.setValue(code);
            }
            setValue(code);
            codeRef.current = code;

            setTimeout(() => {
              isReceivingRemoteChange.current = false;
            }, 50);
          }
        }
      );

      // ========== LISTEN FOR ERROR EVENT ==========
      socketRef.current.on(ACTIONS.ERROR, ({ message }) => {
        console.error("❌ Error event received:", message);
        toast.error(message || "An error occurred");
        setIsLoading(false);
        setJoining(false);
        setIsConnected(false);
        isLoadingRef.current = false; // Update ref
        joiningRef.current = false; // Update ref
      });

      // ========== LISTEN FOR ROOM_USERS_UPDATED EVENT ==========
      // Authoritative roster, broadcast to everyone on every join/leave.
      socketRef.current.on(
        ACTIONS.ROOM_USERS_UPDATED,
        ({ clients: updatedClients }) => {
          console.log("👥 Room users updated:", updatedClients);
          // Backend users carry `id`; the roster renders key={client.socketId}.
          const SAFE_CLIENTS = (
            Array.isArray(updatedClients) ? updatedClients : []
          ).map((client) => ({
            ...client,
            socketId: client.socketId || client.id,
          }));
          setClients(SAFE_CLIENTS);
        }
      );

      // ========== TIMEOUT CHECK ==========
      setTimeout(() => {
        console.log("⏰ [FRONTEND-JOIN] 5-second timeout check:");
        console.log("   Is socket connected?", socketRef.current?.connected);
        console.log("   Still loading?", isLoadingRef.current); // Use ref
        console.log("   Still joining?", joiningRef.current); // Use ref
        console.log("   Room ID:", roomId);

        if (!socketRef.current?.connected) {
          console.error("⚠️ Socket not connected after 5 seconds!");
          toast.error("Connection timeout. Please refresh.");
          setIsLoading(false);
          setJoining(false);
          setIsConnected(false);
          isLoadingRef.current = false; // Update ref
          joiningRef.current = false; // Update ref
        }
        if (isLoadingRef.current || joiningRef.current) {
          // Use refs
          console.warn("⚠️ Still loading/joining after 5 seconds");
          // Try to get room info as fallback
          if (socketRef.current?.connected) {
            console.log("🔄 Trying to get room info as fallback...");
            socketRef.current.emit(ACTIONS.GET_ROOM_INFO, { roomId });
          }
        }
      }, 5000);
    } catch (error) {
      console.error("Socket initialization error:", error);
      toast.error("Failed to join room");
      setIsLoading(false);
      setJoining(false);
      setIsConnected(false);
      isLoadingRef.current = false; // Update ref
      joiningRef.current = false; // Update ref
    }
  }, [roomId, user]); // ✅ Now only roomId and user in dependencies
  // Handle join room
  const handleJoin = useCallback(async () => {
    const cleanId = normalizeRoomId(roomId);
    if (!cleanId) {
      toast.error("Please enter a Room ID");
      return;
    }

    if (!user) {
      navigate("/login", {
        state: {
          // Must match a real route in App.jsx — "/room/join" does not exist
          // and would fall through to the catch-all redirect.
          from: `/room/${cleanId}`,
          roomId: cleanId,
          message: "Please login to join a room",
        },
      });
      return;
    }

    await initSocketConnection();
  }, [roomId, user, navigate, initSocketConnection]);

  // Arriving via a shared /room/:roomId invite link: join automatically instead
  // of showing the paste-the-ID form.
  useEffect(() => {
    if (autoJoinedRef.current) return;
    if (!roomIdParam || !user) return;
    if (normalizeRoomId(roomId) !== normalizeRoomId(roomIdParam)) return;
    autoJoinedRef.current = true;

    // Deferred to a task so the connect (and its setState calls) happens after
    // this render commits rather than synchronously inside the effect body.
    let cancelled = false;
    const id = setTimeout(() => {
      if (!cancelled) initSocketConnection();
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [roomIdParam, roomId, user, initSocketConnection]);

  // Handle code changes with debounce
  const handleCodeChange = useCallback(
    (newValue) => {
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
              language: languageRef.current, // Use languageRef.current instead of language
              user: user.username || "Anonymous",
            });
          }
        }, 300);
      }
    },
    [roomId, user]
  ); // Remove language from dependencies

  // Handle language selection
  const handleLanguageSelect = useCallback(
    (selectedLanguage) => {
      setLanguage(selectedLanguage);
      languageRef.current = selectedLanguage; // Update the ref too

      const newCode = CODE_SNIPPETS[selectedLanguage] || "";
      setValue(newCode);
      codeRef.current = newCode;

      if (socketRef.current && user) {
        socketRef.current.emit(ACTIONS.CODE_CHANGE, {
          roomId,
          code: newCode,
          language: selectedLanguage,
          user: user.username || "Anonymous",
        });

        socketRef.current.emit(ACTIONS.LANGUAGE_CHANGE, {
          roomId,
          language: selectedLanguage,
          user: user.username || "Anonymous",
        });
      }
    },
    [roomId, user]
  );

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

  // Copy room ID to clipboard
  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID copied to clipboard!", {
        icon: "📋",
        duration: 2000,
      });
    } catch (err) {
      toast.error("Failed to copy Room ID");
      console.error(err);
    }
  };

  // Share room
  const shareRoom = async () => {
    // Hand out the joinable invite link, not the current page URL.
    const inviteUrl = `${window.location.origin}/room/${normalizeRoomId(roomId)}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join my collaborative coding room",
          text: `Join me in this real-time code editor! Room ID: ${roomId}`,
          url: inviteUrl,
        });
      } else {
        await navigator.clipboard.writeText(inviteUrl);
        toast.success("Invite link copied — send it to your collaborator!", {
          icon: "🔗",
          duration: 2500,
        });
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
  };

  // Go back to join page
  const goBack = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    setIsConnected(false);
    setClients([]);
    setValue("");
    navigate("/dashboard");
  };

  // Send chat message
  const sendMessage = () => {
    if (!newMessage.trim() || !user) return;

    const timestamp = new Date().toLocaleTimeString();
    const messageData = {
      type: "user",
      user: user.username || "Anonymous",
      message: newMessage,
      timestamp,
    };

    setMessages((prev) => [...prev, messageData]);

    if (socketRef.current) {
      socketRef.current.emit(ACTIONS.CHAT_MESSAGE, {
        roomId,
        user: user.username || "Anonymous",
        message: newMessage,
        timestamp,
      });
    }

    setNewMessage("");
  };

  // Handle Enter key for chat
  const handleChatKeyPress = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  // Handle logout
  const handleLogout = () => {
    if (socketRef.current && user) {
      socketRef.current.emit(ACTIONS.LEAVE, {
        roomId,
        username: user.username || "Anonymous",
      });
    }
    logout();
    navigate("/");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Arriving through a shared invite link: we already know the room, so show a
  // connecting screen rather than a form asking for an ID the user never typed.
  // (Without this, the `if (isLoading)` screen further down is unreachable,
  // because the `if (!isConnected)` form below always returns first.)
  if (!isConnected && roomIdParam && (isLoading || joining)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-gray-900 to-black">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg font-medium">Joining room…</p>
          <p className="text-gray-400 text-sm mt-1">
            {normalizeRoomId(roomIdParam)}
          </p>
        </div>
      </div>
    );
  }

  // Render join form if not connected
  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-gray-900 to-black">
        <div className="w-full max-w-md p-8 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center">
                <FiCode className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Join Collaborative Room
            </h1>
            <p className="text-gray-400">
              Enter the Room ID shared by your friend
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Room ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiKey className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(normalizeRoomId(e.target.value))}
                  placeholder="Paste Room ID here"
                  className="block w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === "Enter" && handleJoin()}
                />
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Ask your friend to share their Room ID with you
              </p>
            </div>

            <button
              onClick={handleJoin}
              disabled={!roomId.trim() || joining}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {joining ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Joining Room...
                </>
              ) : (
                <>
                  <FiUsers className="w-5 h-5 mr-2" />
                  Join Room
                </>
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-800 text-gray-400">or</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate("/dashboard/room/create")}
                className="py-2.5 px-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center"
              >
                <FiCode className="w-4 h-4 mr-2" />
                Create Room
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center border border-gray-700"
              >
                <FiArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </button>
            </div>

            {!user && (
              <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
                <p className="text-sm text-blue-300 text-center">
                  You need to be logged in to join a room. Please login first.
                </p>
                <button
                  onClick={() =>
                    navigate("/login", {
                      state: { from: `/room/${normalizeRoomId(roomId)}`, roomId },
                    })
                  }
                  className="w-full mt-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                >
                  Login Now
                </button>
              </div>
            )}

            <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
              <h4 className="text-sm font-medium text-gray-300 mb-2">
                How to join:
              </h4>
              <ul className="text-xs text-gray-400 space-y-1">
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">1.</span>
                  Get the Room ID from your friend
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">2.</span>
                  Paste the Room ID in the input field above
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">3.</span>
                  Click "Join Room" to enter the collaborative editor
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-linear-to-br from-gray-900 to-black">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-300">
            Connecting to collaborative room...
          </p>
          <p className="mt-2 text-sm text-gray-400">
            Room ID: {roomId.substring(0, 12)}...
          </p>
        </div>
      </div>
    );
  }

  // Render the collaborative editor once connected
  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div
        className={`flex flex-col bg-gray-800 border-r border-gray-700 transition-all duration-300 ${
          sidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
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
            <div className="mt-2">
              <p className="text-sm text-gray-400">Joined Room</p>
              <div className="flex items-center space-x-2 mt-1">
                <code className="text-xs font-mono text-gray-300 truncate">
                  {roomId.substring(0, 12)}...
                </code>
                <button
                  onClick={copyRoomId}
                  className="p-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                  title="Copy Room ID"
                >
                  <FiCopy className="w-3 h-3" />
                </button>
              </div>
            </div>
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
              <div className="text-xs text-gray-400 mb-1">Room ID</div>
              <div className="flex items-center space-x-2">
                <code className="flex-1 px-2 py-1.5 bg-gray-900 rounded text-xs font-mono truncate">
                  {roomId}
                </code>
                <button
                  onClick={copyRoomId}
                  className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                  title="Copy Room ID"
                >
                  <FiCopy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <button
              onClick={shareRoom}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors text-sm"
            >
              <FiShare2 className="w-3.5 h-3.5" />
              <span>Invite Others</span>
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
            {clients && clients.length > 0
              ? clients.map((client) => (
                  <div
                    key={client.socketId}
                    className="flex items-center space-x-2"
                  >
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
                        <div className="font-medium text-sm truncate">
                          {client.username}
                        </div>
                        <div className="text-xs text-gray-400">Online</div>
                      </div>
                    )}
                  </div>
                ))
              : !sidebarCollapsed && (
                  <div className="text-center text-gray-500 py-2">
                    <FiUsers className="w-6 h-6 mx-auto mb-1 opacity-50" />
                    <p className="text-xs">No other users</p>
                  </div>
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
                  <div
                    key={idx}
                    className={`p-1.5 rounded text-xs ${
                      msg.type === "system"
                        ? "bg-gray-900 text-gray-400"
                        : "bg-gray-800"
                    }`}
                  >
                    <div className="flex justify-between">
                      <span
                        className={`font-medium truncate ${
                          msg.type === "system"
                            ? "text-indigo-300"
                            : "text-green-300"
                        }`}
                      >
                        {msg.user}
                      </span>
                      <span className="text-xs text-gray-500">
                        {msg.timestamp}
                      </span>
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
                  onKeyPress={handleChatKeyPress}
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
                    {user.username
                      ? user.username.charAt(0).toUpperCase()
                      : "U"}
                  </div>
                </div>
                {!sidebarCollapsed && (
                  <div className="flex-1">
                    <div className="font-medium text-sm truncate">
                      {user.username || "User"}
                    </div>
                    <div className="text-xs text-green-400">● Online</div>
                    <div className="text-xs text-gray-400 truncate">
                      Joined Room
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
              {showChat ? "Hide Chat" : "Chat"}
            </button>
          )}

          {/* Action Buttons */}
          <div
            className={`mt-3 flex ${
              sidebarCollapsed ? "flex-col space-y-1.5" : "space-x-1.5"
            }`}
          >
            <button
              onClick={goBack}
              className={`flex items-center justify-center ${
                sidebarCollapsed ? "p-1.5" : "flex-1 px-3 py-1.5"
              } bg-gray-700 hover:bg-gray-600 rounded transition-colors text-sm`}
              title="Leave Room"
            >
              <FiArrowLeft className="w-4 h-4" />
              {!sidebarCollapsed && <span className="ml-1.5">Leave</span>}
            </button>
            <button
              onClick={handleLogout}
              className={`flex items-center justify-center ${
                sidebarCollapsed ? "p-1.5" : "flex-1 px-3 py-1.5"
              } bg-red-600 hover:bg-red-700 rounded transition-colors text-sm`}
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
        {sidebarCollapsed ? (
          <FiChevronRight className="w-4 h-4" />
        ) : (
          <FiChevronLeft className="w-4 h-4" />
        )}
      </button>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Editor Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <LanguageSelector
              language={language}
              onSelect={handleLanguageSelect}
            />
            <div className="px-2 py-1 bg-gray-900 rounded">
              <span className="text-xs text-gray-300">
                {language.toUpperCase()}
              </span>
            </div>
            <div className="text-sm text-gray-400">
              Joined: {roomId.substring(0, 8)}...
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={shareRoom}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded transition-colors text-sm"
            >
              <FiShare2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
            <div className="text-xs text-gray-400">
              <span className="text-green-400">●</span> {clients?.length || 0}{" "}
              online
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
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => {
                    toast.success("Running code...");
                  }}
                  className="flex items-center space-x-1 px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs transition-colors"
                >
                  <FiPlay className="w-3 h-3" />
                  <span>Run</span>
                </button>
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
                <span>Lines: {value.split("\n").length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinRoom;
