// src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Home from '../components/dashboard/Home';
import RoomCreate from '../components/dashboard/RoomCreate';
import RoomJoin from '../components/dashboard/RoomJoin';
import './DashboardPage.css';

const DashboardPage = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      navigate('/login');
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(JSON.parse(savedUser));
    }
  }, [navigate]);

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="dashboard-page">
      <Navbar />
      
      <div className="dashboard-layout">
        <aside className="dashboard-sidebar">
          <div className="sidebar-header">
            <div className="user-profile">
              <div className="user-avatar-large">{user.avatar}</div>
              <div className="user-details">
                <h4>{user.name}</h4>
                <p>{user.email}</p>
              </div>
            </div>
          </div>

          <nav className="sidebar-nav">
            <Link to="/dashboard" className="nav-item">
              🏠 Dashboard
            </Link>
            <Link to="/dashboard/create" className="nav-item">
              ➕ Create Room
            </Link>
            <Link to="/dashboard/join" className="nav-item">
              🔗 Join Room
            </Link>
            <div className="nav-divider" />
            <button className="nav-item">
              📁 Recent Rooms
            </button>
            <button className="nav-item">
              ⭐ Starred
            </button>
            <button className="nav-item">
              🕒 History
            </button>
          </nav>

          <div className="sidebar-footer">
            <button className="sidebar-btn">
              ⚙️ Settings
            </button>
            <button className="sidebar-btn">
              ❓ Help
            </button>
          </div>
        </aside>

        <main className="dashboard-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<RoomCreate />} />
            <Route path="/join" element={<RoomJoin />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;