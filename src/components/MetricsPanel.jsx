import React from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import MetricCard from './MetricCard.jsx';

export default function MetricsPanel({ metrics }) {
  const { tokens } = useTheme();

  return (
    <section
      aria-label="Platform Metrics"
      style={{
        padding: '1rem',
        background: tokens.bgSurface,
        border: `1px solid ${tokens.border}`,
        borderRadius: '16px',
      }}
    >
      <h2
        style={{
          color: tokens.accent,
          fontFamily: tokens.fontFamily,
          fontSize: '0.75rem',
          letterSpacing: '0.1em',
          marginBottom: '0.75rem',
        }}
      >
        PLATFORM METRICS
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '12px',
        }}
      >
        {metrics.map((m) => (
          <MetricCard key={m.id} metric={m} />
        ))}
      </div>
    </section>
  );
}
