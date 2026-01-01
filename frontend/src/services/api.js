// src/services/api.js
export const api = {
  async login(email) {
    // Mock API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          user: {
            name: email.split('@')[0],
            email,
            avatar: email[0].toUpperCase()
          },
          token: 'mock-jwt-token'
        });
      }, 1000);
    });
  },

  async createRoom(roomData) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          room: {
            id: Math.random().toString(36).substr(2, 9),
            ...roomData
          }
        });
      }, 1000);
    });
  },

  async joinRoom(roomId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          room: {
            id: roomId,
            name: 'Sample Room',
            participants: []
          }
        });
      }, 1000);
    });
  }
};