import React from 'react';
import { useTheme } from './context/ThemeContext.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';

function App() {
  const { tokens } = useTheme();

  return (
    <div className="app">
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
      <p>Terminus Portal</p>
    </div>
  );
}

export default App;
