///backend/ utils/Actions.js
const ACTIONS = {
    // Room Actions
    CREATE_ROOM: 'create-room',
    ROOM_CREATED: 'room-created',
    JOIN: 'join',
    JOINED: 'joined',
    DISCONNECTED: 'disconnected',
    LEAVE: 'leave',
    USER_JOINED: 'user-joined',      // ADD THIS
    USER_LEFT: 'user-left',          // ADD THIS
    
    // Code Actions
    CODE_CHANGE: 'code-change',
    SYNC_CODE: 'sync-code',
    CODE_UPDATED: 'code-updated',
    CODE_SYNCED: 'code-synced',
    
    // Language Actions
    LANGUAGE_CHANGE: 'language-change',
    LANGUAGE_UPDATED: 'language-updated',
    
    // User Actions
    USER_TYPING: 'user-typing',
    TYPING: 'typing',
    
    // Chat Actions
    CHAT_MESSAGE: 'chat-message',
    NEW_CHAT_MESSAGE: 'new-chat-message',
    
    // Room Management
    ROOM_USERS_UPDATED: 'room-users-updated',
    GET_ROOM_INFO: 'get-room-info',
    ROOM_INFO: 'room-info',
    
    // Room Status
    ROOM_FULL: 'room-full',
    ROOM_NOT_FOUND: 'room-not-found',
    
    // Connection Health
    PING: 'ping',
    PONG: 'pong',
    
    // Error Handling
    ERROR: 'error'
};

module.exports = ACTIONS;