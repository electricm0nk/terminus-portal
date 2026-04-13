import React from 'react';
import { useTheme } from '../context/ThemeContext.jsx';

export default function Header({
  onlineCount = 0,
  totalCount = 0,
  unreachableCount = 0,
  lastChecked = null,
  isPolling = false,
  onRefresh = null,
}) {
  const { tokens } = useTheme();

  return (
    <header
      role="banner"
      style={{
        background: tokens.bgSurface,
        borderBottom: `1px solid ${tokens.border}`,
        padding: '0.75rem 1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontFamily: tokens.fontFamily,
      }}
    >
      <div>
        <div style={{ color: tokens.accent, fontWeight: 'bold', fontSize: '1.1rem' }}>
          TERMINUS PLATFORM PORTAL
        </div>
        <div style={{ color: tokens.textMuted, fontSize: '0.8rem', marginTop: '0.2rem' }}>
          trantor · hintzmann.net · k3s
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {/* Controls slot — filled in Story 5.3 */}
      </div>
    </header>
  );
}
