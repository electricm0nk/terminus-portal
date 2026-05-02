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

// ── Pod signal helper ──────────────────────────────────────────────────────

function derivePodSignal(pods, namespace) {
  if (!pods) return { status: 'unknown', signal: 'no pod data', restartCount: 0 };
  const nsPods = pods.filter((p) => p.namespace === namespace);
  if (nsPods.length === 0) return { status: 'no-signal', signal: 'no pod', restartCount: 0 };
  const running = nsPods.filter((p) => p.phase === 'Running' && p.ready);
  const totalRestarts = nsPods.reduce((s, p) => s + (p.restartCount || 0), 0);
  const status = running.length > 0 ? 'up' : 'down';
  return { status, signal: `${running.length}/${nsPods.length} running`, restartCount: totalRestarts };
}

// ── Component ──────────────────────────────────────────────────────────────

/**
 * FourDogsHealthPanel — shows live health for the 5 Fourdogs microservices.
 *
 * Props:
 *   pods — optional array of PodSummary from /api/k8s/pods/all (passed from App/PodsTab state)
 *          If absent, the component fetches its own pod data.
 */
export default function FourDogsHealthPanel({ pods: podsProp }) {
  const { tokens } = useTheme();
  const [state, dispatch] = useReducer(reducer, { loading: true, error: null, data: null });
  const [pods, setPods] = React.useState(podsProp || null);

  // Fetch fourdogs-central health (aggregated by sidecar)
  const fetchHealth = useCallback(() => {
    dispatch({ type: 'START_LOADING' });
    fetch('/api/fourdogs/health')
      .then((r) => r.json())
      .then((d) => dispatch({ type: 'SET_DATA', data: d }))
      .catch((e) => dispatch({ type: 'SET_ERROR', error: e.message || 'fetch error' }));
  }, []);

  // Fetch pods independently if not supplied by parent
  const fetchPods = useCallback(() => {
    if (podsProp) return; // parent controls pod data
    fetch('/api/k8s/pods/all')
      .then((r) => r.json())
      .then((data) => setPods(Array.isArray(data) ? data : []))
      .catch(() => setPods([]));
  }, [podsProp]);

  useEffect(() => {
    fetchHealth();
    fetchPods();
  }, [fetchHealth, fetchPods]);

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
    // emailfetcher: conditional — 'no-signal' if endpoint absent
    rows.push({
      label: 'Emailfetcher',
      status: d.emailfetcher.status,
      signal: d.emailfetcher.status === 'no-signal' ? 'no signal' : d.emailfetcher.signal,
      id: 'emailfetcher',
    });
  }

  // Etailpet trigger workers — pod-phase signals
  const triggerSignal      = derivePodSignal(pods, 'fourdogs-etailpet-trigger');
  const salesTriggerSignal = derivePodSignal(pods, 'fourdogs-etailpet-sales-trigger');
  rows.push({
    label: 'ETailPet Trigger',
    status: triggerSignal.status,
    signal: triggerSignal.signal,
    restartCount: triggerSignal.restartCount,
    id: 'etailpet-trigger',
  });
  rows.push({
    label: 'ETailPet Sales Trigger',
    status: salesTriggerSignal.status,
    signal: salesTriggerSignal.signal,
    restartCount: salesTriggerSignal.restartCount,
    id: 'etailpet-sales-trigger',
  });

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
