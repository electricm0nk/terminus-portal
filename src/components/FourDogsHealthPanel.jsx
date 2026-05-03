import React, { useEffect, useReducer, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';

// ── State machine ──────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {
    case 'START_LOADING':
      return { ...state, loading: true, error: null };
    case 'SET_DATA':
      return { ...state, loading: false, data: action.data };
    case 'SET_ERROR':
      return { ...state, loading: false, error: action.error };
    default:
      return state;
  }
}

// ── Component ──────────────────────────────────────────────────────────────

/**
 * FourDogsHealthPanel — shows live health for the 5 Fourdogs microservices.
 * All health signals (including etailpet trigger pod status) come from the
 * sidecar's /api/fourdogs/health endpoint — no client-side pod fetching.
 */
export default function FourDogsHealthPanel() {
  const { tokens } = useTheme();
  const [state, dispatch] = useReducer(reducer, { loading: true, error: null, data: null });

  // Fetch fourdogs-central health (aggregated by sidecar, including trigger pod status)
  const fetchHealth = useCallback(() => {
    dispatch({ type: 'START_LOADING' });
    fetch('/api/fourdogs/health')
      .then((r) => r.json())
      .then((d) => dispatch({ type: 'SET_DATA', data: d }))
      .catch((e) => dispatch({ type: 'SET_ERROR', error: e.message || 'fetch error' }));
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  // ── Styles ──────────────────────────────────────────────────────────────

  const panelStyle = {
    padding: '1rem',
    background: tokens.bgSurface,
    border: `1px solid ${tokens.border}`,
    borderRadius: '16px',
    fontFamily: tokens.fontFamily,
    marginTop: '1rem',
  };
  const titleStyle = {
    color: tokens.accent, fontSize: '0.75rem', letterSpacing: '0.1em',
    textTransform: 'uppercase', marginBottom: '0.75rem',
  };
  const rowStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0.45rem 0', borderBottom: `1px solid ${tokens.border}`,
    fontSize: '0.83rem',
  };
  const lastRowStyle = { ...rowStyle, borderBottom: 'none' };

  function statusColor(status) {
    switch (status) {
      case 'up':       return tokens.statusOnline;
      case 'down':     return tokens.statusUnreachable;
      case 'no-signal': return tokens.statusNoCheck;
      default:         return tokens.statusNoCheck;
    }
  }

  function statusLabel(status, signal) {
    if (status === 'up')        return signal && signal !== 'UP' ? signal : 'UP';
    if (status === 'no-signal') return 'no signal';
    if (status === 'down')      return signal || 'DOWN';
    return signal || '—';
  }

  // ── Derive rows ──────────────────────────────────────────────────────────

  const rows = [];

  if (!state.loading && state.data) {
    const d = state.data;
    rows.push({ label: 'Central UI',    ...d.centralUi,    id: 'central-ui' });
    rows.push({ label: 'Central API',   ...d.centralApi,   id: 'central-api' });
    rows.push({
      label: 'Emailfetcher',
      status: d.emailfetcher.status,
      signal: d.emailfetcher.status === 'no-signal' ? 'no signal' : d.emailfetcher.signal,
      id: 'emailfetcher',
    });
    rows.push({ label: 'ETailPet Trigger',       ...d.etailpetTrigger,      id: 'etailpet-trigger' });
    rows.push({ label: 'ETailPet Sales Trigger', ...d.etailpetSalesTrigger, id: 'etailpet-sales-trigger' });
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <section style={panelStyle} aria-label="FourDogs Service Health" data-testid="fourdogs-health-panel">
      <h2 style={titleStyle}>FOURDOGS HEALTH</h2>
      {state.loading && (
        <div style={{ color: tokens.textMuted, fontSize: '0.82rem' }}>Loading…</div>
      )}
      {state.error && (
        <div style={{ color: tokens.statusUnreachable, fontSize: '0.82rem' }}>Error: {state.error}</div>
      )}
      {rows.map((row, i) => (
        <div key={row.id} data-testid={`fdh-row-${row.id}`}
          style={i === rows.length - 1 ? lastRowStyle : rowStyle}>
          <span style={{ color: tokens.text }}>{row.label}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {row.restartCount > 5 && (
              <span style={{ color: tokens.statusUnreachable, fontSize: '0.75rem' }}>
                {row.restartCount} restarts ⚠
              </span>
            )}
            <span style={{ color: statusColor(row.status), fontWeight: '600', fontSize: '0.8rem' }}>
              {statusLabel(row.status, row.signal)}
            </span>
          </span>
        </div>
      ))}
    </section>
  );
}
