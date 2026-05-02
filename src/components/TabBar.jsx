import React from 'react';
import { useTheme } from '../context/ThemeContext.jsx';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'release-pipeline', label: 'Release Pipeline' },
  { id: 'pods', label: 'Pods' },
];

export default function TabBar({ activeTab, onTabChange }) {
  const { tokens } = useTheme();

  return (
    <nav
      role="tablist"
      aria-label="Portal views"
      style={{
        display: 'flex',
        gap: '0',
        borderBottom: `2px solid ${tokens.border}`,
        marginTop: '0.5rem',
        fontFamily: tokens.fontFamily,
      }}
    >
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            style={{
              background: isActive ? tokens.bgSurface : 'transparent',
              color: isActive ? tokens.accent : tokens.textMuted,
              border: 'none',
              borderBottom: isActive ? `2px solid ${tokens.accent}` : '2px solid transparent',
              padding: '0.5rem 1.25rem',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontFamily: tokens.fontFamily,
              fontWeight: isActive ? 'bold' : 'normal',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: '-2px',
              transition: 'color 0.15s',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
