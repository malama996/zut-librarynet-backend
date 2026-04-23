import React, { useState, useEffect } from 'react';
import bgImage from '../assets/images/backgrounds/p3.jpg';

function AuthLayout({ children }) {
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.src = bgImage;
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundImage: imageLoaded ? `url(${bgImage})` : 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8c 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        position: 'relative',
        transition: 'background-image 0.5s ease-in-out',
      }}
    >
      {/* Overlay for better text readability */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(30, 58, 95, 0.55)',
        zIndex: 1,
      }} />
      {/* Content */}
      <div style={{ width: '100%', maxWidth: '28rem', position: 'relative', zIndex: 2 }}>
        {children}
      </div>
    </div>
  );
}

export default AuthLayout;
