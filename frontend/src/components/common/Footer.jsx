// src/components/common/Footer.jsx
import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-links">
          <button className="footer-link">Features</button>
          <button className="footer-link">Learn more</button>
          <button className="footer-link">Support</button>
        </div>
        <div className="footer-info">
          <p className="copyright">© Collixy 2025. All rights reserved.</p>
          <div className="social-links">
            <button className="social-link">Twitter</button>
            <button className="social-link">GitHub</button>
            <button className="social-link">Discord</button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;