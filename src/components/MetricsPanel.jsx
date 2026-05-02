import React, { useEffect, useState, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import MetricCard from './MetricCard.jsx';

// Extract scalar value from a Prometheus instant-query JSON response.
// Returns a formatted string (2 decimal places) or null if no data.
function extractPromValue(json) {
  try {
    const result = json?.data?.result;
    if (!result || result.length === 0) return null;
    const raw = result[0]?.value?.[1];
    if (raw == null) return null;
    const num = parseFloat(raw);
    return isNaN(num) ? null : parseFloat(num.toFixed(2));
  } catch {
    return null;
  }
}

export default function MetricsPanel({ metrics }) {
  const { tokens } = useTheme();
  const [liveValues, setLiveValues] = useState({});

  const fetchMetrics = useCallback(() => {
    const wired = metrics.filter((m) => m.wired && m.query);
    if (wired.length === 0) return;

    Promise.allSettled(
      wired.map((m) =>
        fetch(`/api/metrics/query?query=${encodeURIComponent(m.query)}`)
          .then((r) => r.json())
          .then((json) => ({ id: m.id, value: extractPromValue(json) }))
          .catch(() => ({ id: m.id, value: null }))
      )
    ).then((results) => {
      const next = {};
      results.forEach((r) => {
        if (r.status === 'fulfilled') next[r.value.id] = r.value.value;
      });
      setLiveValues((prev) => ({ ...prev, ...next }));
    });
  }, [metrics]);

  useEffect(() => {
    fetchMetrics();
    const id = setInterval(fetchMetrics, 30_000);
    return () => clearInterval(id);
  }, [fetchMetrics]);

  // Merge static definitions with live values
  const enriched = metrics.map((m) => ({
    ...m,
    value: m.id in liveValues ? liveValues[m.id] : m.value,
  }));

  return (
    <section
      aria-label="Platform Metrics"
      data-testid="metrics-panel"
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
        {enriched.map((m) => (
          <MetricCard key={m.id} metric={m} />
        ))}
      </div>
    </section>
  );
}

