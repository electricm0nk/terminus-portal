import React, { useEffect, useReducer, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';

const POLL_MS = 60_000;

function reducer(state, action) {
  switch (action.type) {
    case 'START_LOADING':
      return { ...state, loading: true, error: null };
    case 'SET_DATA':
      return { ...state, loading: false, error: null, data: action.data };
    case 'SET_ERROR':
      return { ...state, loading: false, error: action.error };
    default:
      return state;
  }
}

/**
 * ArgoCDStatusPanel — shows ArgoCD sync and health aggregate counts.
 * Fetches GET /api/argocd/status every 60 seconds.
 */
export default function ArgoCDStatusPanel() {
  const { tokens } = useTheme();
  const [state, dispatch] = useReducer(reducer, { loading: true, error: null, data: null });

  const fetchStatus = useCallback(() => {
    dispatch({ type: 'START_LOADING' });
    fetch('/api/argocd/status')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => dispatch({ type: 'SET_DATA', data: d }))
      .catch((e) => dispatch({ type: 'SET_ERROR', error: e.message || 'fetch error' }));
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, POLL_MS);
    return () => clearInterval(id);
  }, [fetchStatus]);

  // ── Styles ─────────────────────────────────────────────────────────────

  const panelStyle = {
    padding: '1rem',
    background: tokens.bgSurface,
    border: `1px solid ${tokens.border}`,
    borderRadius: '16px',
    fontFamily: tokens.fontFamily,
  };
  const titleStyle = {
    color: tokens.accent,
    fontSize: '0.75rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: '0.75rem',
  };
  const sectionLabelStyle = {
    color: tokens.textMuted,
    fontSize: '0.7rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginTop: '0.5rem',
    marginBottom: '0.25rem',
  };
  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.35rem 0',
    borderBottom: `1px solid ${tokens.border}`,
    fontSize: '0.83rem',
  };
  const lastRowStyle = { ...rowStyle, borderBottom: 'none' };

  // ── Render ──────────────────────────────────────────────────────────────

  const { data } = state;

  const syncRows = [
    { id: 'synced',     label: 'Synced',    value: data?.synced,    color: tokens.statusOnline },
    { id: 'out-of-sync', label: 'Out of Sync', value: data?.outOfSync, color: data?.outOfSync > 0 ? tokens.statusUnreachable : tokens.textMuted },
  ];

  const healthRows = [
    { id: 'healthy',     label: 'Healthy',     value: data?.healthy,     color: tokens.statusOnline },
    { id: 'degraded',    label: 'Degraded',    value: data?.degraded,    color: data?.degraded > 0 ? tokens.statusUnreachable : tokens.textMuted },
    { id: 'progressing', label: 'Progressing', value: data?.progressing, color: tokens.statusChecking ?? tokens.accent },
    { id: 'suspended',   label: 'Suspended',   value: data?.suspended,   color: tokens.textMuted },
    { id: 'missing',     label: 'Missing',     value: data?.missing,     color: data?.missing > 0 ? tokens.statusUnreachable : tokens.textMuted },
  ].filter((r) => r.value != null && r.value > 0 || r.id === 'healthy' || r.id === 'degraded');

  function statValue(v) {
    return v != null ? String(v) : '—';
  }

  return (
    <section style={panelStyle} aria-label="ArgoCD Status" data-testid="argocd-status-panel">
      <h2 style={titleStyle}>
        ARGOCD{data != null && <span style={{ color: tokens.textMuted, fontWeight: 400 }}> · {data.total} apps</span>}
      </h2>

      {state.loading && !data && (
        <div style={{ color: tokens.textMuted, fontSize: '0.82rem' }}>Loading…</div>
      )}
      {state.error && (
        <div style={{ color: tokens.statusUnreachable, fontSize: '0.82rem' }}>Error: {state.error}</div>
      )}

      {data && (
        <>
          <div style={sectionLabelStyle}>Sync</div>
          {syncRows.map((row, i) => (
            <div key={row.id} data-testid={`argocd-sync-${row.id}`}
              style={i === syncRows.length - 1 ? lastRowStyle : rowStyle}>
              <span style={{ color: tokens.text }}>{row.label}</span>
              <span style={{ color: row.color, fontWeight: '600', fontSize: '0.8rem' }}>
                {statValue(row.value)}
              </span>
            </div>
          ))}

          <div style={{ ...sectionLabelStyle, marginTop: '0.75rem' }}>Health</div>
          {healthRows.map((row, i) => (
            <div key={row.id} data-testid={`argocd-health-${row.id}`}
              style={i === healthRows.length - 1 ? lastRowStyle : rowStyle}>
              <span style={{ color: tokens.text }}>{row.label}</span>
              <span style={{ color: row.color, fontWeight: '600', fontSize: '0.8rem' }}>
                {statValue(row.value)}
              </span>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
