//frontend utils/Actions.js
// MUST stay in sync with backend/src/utils/Actions.js (same keys, same values).
//
// Naming convention — inbound and outbound names are deliberately different:
//   client -> server : CODE_CHANGE, LANGUAGE_CHANGE, CHAT_MESSAGE, USER_TYPING
//   server -> client : CODE_UPDATED, LANGUAGE_UPDATED, NEW_CHAT_MESSAGE, TYPING
// So never use the same constant for both .emit() and .on().
export const ACTIONS = {
    // Room Actions
    CREATE_ROOM: 'create-room',
    ROOM_CREATED: 'room-created',
    JOIN: 'join',
    JOINED: 'joined',
    DISCONNECTED: 'disconnected',
    LEAVE: 'leave',
    USER_JOINED: 'user-joined',
    USER_LEFT: 'user-left',

    // Code Actions
    CODE_CHANGE: 'code-change',        // emit
    SYNC_CODE: 'sync-code',
    CODE_UPDATED: 'code-updated',      // listen
    CODE_SYNCED: 'code-synced',

    // Language Actions
    LANGUAGE_CHANGE: 'language-change',    // emit
    LANGUAGE_UPDATED: 'language-updated',  // listen

    // User Actions
    USER_TYPING: 'user-typing',        // emit
    TYPING: 'typing',                  // listen

    // Chat Actions
    CHAT_MESSAGE: 'chat-message',          // emit
    NEW_CHAT_MESSAGE: 'new-chat-message',  // listen

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
    ERROR: 'error',
    CONNECT_ERROR: 'connect_error',
    CONNECT_FAILED: 'connect_failed'
};

export default ACTIONS;
