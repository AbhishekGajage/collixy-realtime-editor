// src/components/dashboard/Home.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const [user] = React.useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : { name: 'User' };
  });

  const features = [
    {
      title: 'Live Support',
      description: 'Get instant help while you code. Our real-time support ensures quick issue resolution, smooth collaboration, and uninterrupted development for teams of any size.',
      icon: '💬'
    },
    {
      title: 'Team Collaboration',
      description: 'Collaborate with your team in real time. Edit code simultaneously, see live cursors, share changes instantly, and communicate efficiently without switching tools.',
      icon: '👥'
    },
    {
      title: 'Seamless Onboarding',
      description: 'Start coding in minutes. Simple setup, intuitive interface, and guided onboarding help developers and teams get productive from day one.',
      icon: '🚀'
    },
    {
      title: 'Powerful Code Editor',
      description: 'Experience a fast, intelligent editor with syntax highlighting, auto-completion, multi-language support, and customizable workflows built for modern development.',
      icon: '⌨️'
    },
    {
      title: 'Code Quality & Security',
      description: 'Maintain high-quality code with built-in linking, version control integration, access management, and secure real-time synchronization.',
      icon: '🔒'
    },
    {
      title: 'Real-Time Results',
      description: 'Track progress instantly. See changes as they happen, reduce conflicts, accelerate delivery, and turn collaboration into measurable results.',
      icon: '📊'
    }
  ];

  return (
    <div className="dashboard-home">
      <div className="dashboard-hero">
        <h1>Welcome, {user.name}</h1>
        <p className="hero-subtitle">Start coding with your team in real-time</p>
        <button 
          className="hero-btn"
          onClick={() => navigate('/dashboard/create')}
        >
          Get Started
        </button>
      </div>

      <div className="dashboard-features">
        <h2 className="section-title">Why Choose Collixy?</h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-item">
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;