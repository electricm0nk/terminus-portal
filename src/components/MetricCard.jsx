import React from 'react';
import { useTheme } from '../context/ThemeContext.jsx';

export default function MetricCard({ metric }) {
  const { tokens } = useTheme();
  const isActive = metric.wired && metric.value !== null;

  return (
    <div
      style={{
        background: tokens.bgCard,
        border: `1px solid ${tokens.border}`,
        padding: '0.75rem',
        fontFamily: tokens.fontFamily,
        color: tokens.text,
      }}
    >
      <div style={{ color: tokens.textMuted, fontSize: '0.75rem', marginBottom: '0.3rem' }}>
        {metric.label}
      </div>
      <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: tokens.accent }}>
        {isActive ? `${metric.value}${metric.unit}` : '—'}
      </div>
      <div style={{ color: tokens.textMuted, fontSize: '0.7rem', marginTop: '0.3rem' }}>
        <span>{metric.source.toUpperCase()}</span>
      </div>
      {!isActive && (
        <div style={{ color: tokens.textMuted, fontSize: '0.7rem', marginTop: '0.2rem' }}>
          WIRE TO {metric.source.toUpperCase()} TO ENABLE
        </div>
      )}
    </div>
  );
}
