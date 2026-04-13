import React, { createContext, useContext, useState } from 'react';
import terminal from '../themes/terminal.js';
import spaceops from '../themes/spaceops.js';

const THEMES = { terminal, spaceops };
const DEFAULT_THEME = 'spaceops';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeName, setThemeName] = useState(DEFAULT_THEME);
  const tokens = THEMES[themeName] ?? THEMES[DEFAULT_THEME];

  function toggleTheme() {
    setThemeName((prev) => (prev === 'spaceops' ? 'terminal' : 'spaceops'));
  }

  return (
    <ThemeContext.Provider value={{ tokens, themeName, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx === null) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
