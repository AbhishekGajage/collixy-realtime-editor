module.exports = {
  // User roles
  ROLES: {
    VIEWER: 'viewer',
    EDITOR: 'editor',
    ADMIN: 'admin'
  },

  // Document languages
  LANGUAGES: [
    'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp',
    'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'scala',
    'html', 'css', 'scss', 'less', 'json', 'xml', 'yaml',
    'markdown', 'sql', 'graphql', 'shell', 'dockerfile', 'makefile'
  ],

  // Editor themes
  THEMES: ['light', 'dark', 'system'],

  // Room settings defaults
  ROOM_DEFAULTS: {
    maxUsers: 50,
    allowAnonymous: false,
    requireApproval: false,
    chatEnabled: true,
    cursorSharing: true,
    selectionSharing: true
  },

  // Document settings defaults
  DOCUMENT_DEFAULTS: {
    tabSize: 2,
    fontSize: 14,
    lineNumbers: true,
    wordWrap: false,
    minimap: true,
    autoSave: true,
    formatOnSave: false,
    autoComplete: true
  },

  // Pagination defaults
  PAGINATION: {
    PAGE: 1,
    LIMIT: 20,
    MAX_LIMIT: 50
  },

  // Cache TTLs (in seconds)
  CACHE_TTL: {
    USER: 3600, // 1 hour
    DOCUMENT: 1800, // 30 minutes
    ROOM: 300, // 5 minutes
    PUBLIC_DOCS: 60 // 1 minute
  }
};