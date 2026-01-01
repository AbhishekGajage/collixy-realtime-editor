// src/components/editor/UserList.jsx
import React, { useState, useEffect } from 'react';
import './UserList.css';

const UserList = ({ roomId }) => {
  const [users, setUsers] = useState([]);
  const [currentUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    // Simulate fetching users from WebSocket or API
    const mockUsers = [
      { id: 1, name: 'You', email: currentUser?.email || 'you@example.com', avatar: currentUser?.avatar || 'U', isOnline: true },
      { id: 2, name: 'Alex Johnson', email: 'alex@example.com', avatar: 'A', isOnline: true },
      { id: 3, name: 'Maria Garcia', email: 'maria@example.com', avatar: 'M', isOnline: true },
      { id: 4, name: 'Sam Wilson', email: 'sam@example.com', avatar: 'S', isOnline: false },
      { id: 5, name: 'Taylor Kim', email: 'taylor@example.com', avatar: 'T', isOnline: true }
    ];
    
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUsers(mockUsers);
    
    // In a real app, you would connect to WebSocket here
    // and update users in real-time
  }, [currentUser]);

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    alert(`Room ID ${roomId} copied to clipboard!`);
  };

  return (
    <div className="user-list">
      <div className="room-info">
        <h4>Room ID</h4>
        <div className="room-id-display">
          <code>{roomId}</code>
          <button className="copy-btn" onClick={copyRoomId} title="Copy Room ID">
            📋
          </button>
        </div>
      </div>

      <div className="collaborators-section">
        <h4>Collaborators ({users.length})</h4>
        <div className="user-list-content">
          {users.map(user => (
            <div key={user.id} className="user-item">
              <div className="user-avatar-container">
                <div className={`user-avatar ${user.name === 'You' ? 'current-user' : ''}`}>
                  {user.avatar}
                </div>
                <div className={`status-dot ${user.isOnline ? 'online' : 'offline'}`} />
              </div>
              <div className="user-info">
                <span className="user-name">
                  {user.name}
                  {user.name === 'You' && <span className="you-badge">You</span>}
                </span>
                <span className="user-email">{user.email}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="room-actions">
        <h4>Room Actions</h4>
        <button className="room-action-btn">
          🔗 Invite People
        </button>
        <button className="room-action-btn">
          ⚙️ Room Settings
        </button>
        <button className="room-action-btn">
          💬 Chat
        </button>
      </div>
    </div>
  );
};

export default UserList;