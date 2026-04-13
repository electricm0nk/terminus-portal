import React from 'react';
import { useTheme } from '../context/ThemeContext.jsx';

export default function RefreshButton({ onRefresh, isPolling }) {
  const { tokens } = useTheme();

  return (
    <button
      aria-label="Refresh health status"
      onClick={onRefresh}
      disabled={isPolling}
      style={{
        background: isPolling ? tokens.accentDim : tokens.bgSurface,
        color: tokens.accent,
        border: `1px solid ${tokens.border}`,
        padding: '0.4rem 0.9rem',
        cursor: isPolling ? 'not-allowed' : 'pointer',
        fontFamily: tokens.fontFamily,
        fontSize: '0.85rem',
        opacity: isPolling ? 0.6 : 1,
      }}
    >
      ↻ Refresh
    </button>
  );
}
