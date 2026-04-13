import React, { createContext, useContext, useState } from 'react';
import terminal from '../themes/terminal.js';
import spaceops from '../themes/spaceops.js';

const THEMES = { terminal, spaceops };
const DEFAULT_THEME = 'spaceops';
const STORAGE_KEY = 'terminus-portal-theme';

function readStoredTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored in THEMES ? stored : DEFAULT_THEME;
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeName, setThemeName] = useState(readStoredTheme);
  const tokens = THEMES[themeName] ?? THEMES[DEFAULT_THEME];

  function toggleTheme() {
    setThemeName((prev) => {
      const next = prev === 'spaceops' ? 'terminal' : 'spaceops';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
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
