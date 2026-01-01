// src/components/dashboard/RoomCreate.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RoomCreate.css';

const RoomCreate = () => {
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('');
  const [roomType, setRoomType] = useState('public');
  const [createdRoom, setCreatedRoom] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!roomName.trim()) {
      alert('Please enter a room name');
      return;
    }

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      const newRoom = {
        id: generateRoomId(),
        name: roomName,
        type: roomType,
        createdAt: new Date().toISOString(),
        createdBy: JSON.parse(localStorage.getItem('user')).name
      };
      
      // Save to localStorage (in a real app, this would be an API call)
      const rooms = JSON.parse(localStorage.getItem('rooms') || '[]');
      rooms.push(newRoom);
      localStorage.setItem('rooms', JSON.stringify(rooms));
      
      setCreatedRoom(newRoom);
      setLoading(false);
    }, 1000);
  };

  const copyRoomId = () => {
    if (createdRoom) {
      navigator.clipboard.writeText(createdRoom.id);
      alert('Room ID copied to clipboard!');
    }
  };

  const joinRoom = () => {
    if (createdRoom) {
      navigate(`/editor/${createdRoom.id}`);
    }
  };

  return (
    <div className="room-create">
      <div className="room-create-container">
        <h2>Create New Room</h2>
        <p className="subtitle">Start a new collaboration session</p>

        {!createdRoom ? (
          <form className="room-form" onSubmit={handleCreateRoom}>
            <div className="form-group">
              <label htmlFor="roomName">Room Name</label>
              <input
                type="text"
                id="roomName"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Enter room name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="roomType">Room Type</label>
              <select
                id="roomType"
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
              >
                <option value="public">Public (Anyone can join)</option>
                <option value="private">Private (Invite only)</option>
              </select>
            </div>

            <button 
              type="submit" 
              className="create-btn"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </form>
        ) : (
          <div className="room-created">
            <div className="success-icon">🎉</div>
            <h3>Room Created Successfully!</h3>
            <p>Share this Room ID with your team members:</p>
            
            <div className="room-id-display">
              <code className="room-id">{createdRoom.id}</code>
              <button className="copy-btn" onClick={copyRoomId}>
                📋 Copy
              </button>
            </div>

            <div className="room-info">
              <p><strong>Room Name:</strong> {createdRoom.name}</p>
              <p><strong>Type:</strong> {createdRoom.type}</p>
              <p><strong>Created by:</strong> {createdRoom.createdBy}</p>
            </div>

            <div className="action-buttons">
              <button className="join-btn" onClick={joinRoom}>
                Join Room Now
              </button>
              <button 
                className="back-btn"
                onClick={() => setCreatedRoom(null)}
              >
                Create Another Room
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomCreate;