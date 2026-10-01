//frontend services/socket.js
import { io } from 'socket.io-client';

export const initSocket = async () => {
  const options = {
    'force new connection': true,
    reconnectionAttempts: 3,
    timeout: 10000,
    transports: ['websocket', 'polling'],
    withCredentials: true
  };
  
  const socketUrl = (import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5001').replace(/\/+$/, '');
  
  const socket = io(socketUrl, options);
  
  return new Promise((resolve, reject) => {
    let timer = null;
    const cleanup = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      cleanup();
      resolve(socket);
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      cleanup();
      reject(error);
    });
    
    // Timeout after 10 seconds
    timer = setTimeout(() => {
      if (!socket.connected) {
        cleanup();
        reject(new Error('Connection timeout'));
        socket.disconnect();
      }
    }, 10000);
  });
};