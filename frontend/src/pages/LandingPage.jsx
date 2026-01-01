// src/pages/LandingPage.jsx
import React from 'react';
import Navbar from '../components/common/Navbar';
import FeatureCard from '../components/common/FeatureCard';
import Footer from '../components/common/Footer';
import './LandingPage.css';

const LandingPage = () => {
  const features = [
    {
      icon: '💬',
      title: 'Live Support',
      description: 'Get instant help while you code. Our real-time support ensures quick issue resolution, smooth collaboration, and uninterrupted development for teams of any size.'
    },
    {
      icon: '👥',
      title: 'Team Collaboration',
      description: 'Collaborate with your team in real time. Edit code simultaneously, see live cursors, share changes instantly, and communicate efficiently without switching tools.'
    },
    {
      icon: '🚀',
      title: 'Seamless Onboarding',
      description: 'Start coding in minutes. Simple setup, intuitive interface, and guided onboarding help developers and teams get productive from day one.'
    },
    {
      icon: '⌨️',
      title: 'Powerful Code Editor',
      description: 'Experience a fast, intelligent editor with syntax highlighting, auto-completion, multi-language support, and customizable workflows built for modern development.'
    },
    {
      icon: '🔒',
      title: 'Code Quality & Security',
      description: 'Maintain high-quality code with built-in linking, version control integration, access management, and secure real-time synchronization.'
    },
    {
      icon: '📊',
      title: 'Real-Time Results',
      description: 'Track progress instantly. See changes as they happen, reduce conflicts, accelerate delivery, and turn collaboration into measurable results.'
    }
  ];

  return (
    <div className="landing-page">
      <Navbar />
      
      <main className="landing-main">
        <section className="hero-section">
          <h1 className="hero-title">Code With Your Team Live</h1>
          <p className="hero-subtitle">Real-time collaborative coding platform for developers</p>
          <button className="hero-button">
            Get Started
          </button>
        </section>

        <section className="features-section">
          <h2 className="section-title">Everything You Need to Code Together</h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            ))}
          </div>
        </section>

        <section className="cta-section">
          <h2>Ready to Start Coding Together?</h2>
          <p>Join thousands of developers who use Collixy to collaborate in real-time.</p>
          <button className="cta-button">
            Start Free Trial
          </button>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;