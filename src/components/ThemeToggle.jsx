import React from 'react';
import { useTheme } from '../context/ThemeContext.jsx';

export default function ThemeToggle() {
  const { themeName, toggleTheme, tokens } = useTheme();
  const label =
    themeName === 'spaceops' ? 'Switch to Terminal theme' : 'Switch to Space Ops theme';

  return (
    <button
      aria-label={label}
      onClick={toggleTheme}
      style={{
        background: tokens.bgSurface,
        color: tokens.accent,
        border: `1px solid ${tokens.border}`,
        padding: '0.4rem 0.9rem',
        cursor: 'pointer',
        fontFamily: 'monospace',
        fontSize: '0.85rem',
      }}
    >
      {themeName === 'spaceops' ? '⬛ Terminal' : '🟩 Space Ops'}
    </button>
  );
}
