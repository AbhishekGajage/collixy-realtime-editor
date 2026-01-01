// src/components/dashboard/RoomJoin.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RoomJoin.css';

const RoomJoin = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    
    if (!roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }

    setLoading(true);
    setError('');
    
    // Simulate room validation
    setTimeout(() => {
      // In a real app, you would validate with backend
      const rooms = JSON.parse(localStorage.getItem('rooms') || '[]');
      const roomExists = rooms.some(room => room.id === roomId.toUpperCase());
      
      if (roomExists) {
        navigate(`/editor/${roomId.toUpperCase()}`);
      } else {
        setError('Room not found. Please check the Room ID');
        setLoading(false);
      }
    }, 1000);
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRoomId(text);
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  return (
    <div className="room-join">
      <div className="room-join-container">
        <h2>Join a Room</h2>
        <p className="subtitle">Enter Room ID to join an existing collaboration session</p>

        <form className="join-form" onSubmit={handleJoinRoom}>
          <div className="form-group">
            <label htmlFor="roomId">Room ID</label>
            <div className="input-with-button">
              <input
                type="text"
                id="roomId"
                value={roomId}
                onChange={(e) => {
                  setRoomId(e.target.value);
                  setError('');
                }}
                placeholder="Paste room ID here"
                className={error ? 'error' : ''}
              />
              <button 
                type="button" 
                className="paste-btn"
                onClick={pasteFromClipboard}
              >
                📋 Paste
              </button>
            </div>
            {error && <p className="error-message">{error}</p>}
          </div>

          <button 
            type="submit" 
            className="join-btn"
            disabled={loading}
          >
            {loading ? 'Connecting...' : 'Connect'}
          </button>
        </form>

        <div className="help-section">
          <h4>How to join a room?</h4>
          <ul>
            <li>Ask your team member for the Room ID</li>
            <li>Paste the Room ID in the field above</li>
            <li>Click "Connect" to join the session</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RoomJoin;