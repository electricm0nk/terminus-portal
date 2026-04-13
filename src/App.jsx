import React from 'react';
import { useTheme } from './context/ThemeContext.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import ServiceGrid from './components/ServiceGrid.jsx';
import { SERVICES } from './config/services.js';

function App() {
  const { tokens } = useTheme();

  return (
    <div className="app" style={{ background: tokens.bg, color: tokens.text, minHeight: '100vh' }}>
      {tokens.scanlines && (
        <div
          className="scanlines-overlay"
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 9999,
            background:
              'repeating-linear-gradient(transparent 0px, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)',
          }}
        />
      )}
      <ThemeToggle />
      <ServiceGrid services={SERVICES} statusMap={{}} />
    </div>
  );
}

export default App;
