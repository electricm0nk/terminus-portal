import React, { useEffect, useReducer, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';

// ── State machine ──────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {
    case 'START_LOADING':
      return { ...state, loading: true, error: null };
    case 'SET_DATA':
      return { ...state, loading: false, pods: action.pods, grouped: groupByNamespace(action.pods) };
    case 'SET_ERROR':
      return { ...state, loading: false, error: action.error };
    default:
      return state;
  }
}

function groupByNamespace(pods) {
  const map = {};
  for (const pod of pods) {
    if (!map[pod.namespace]) map[pod.namespace] = [];
    map[pod.namespace].push(pod);
  }
  // Sort pods within each namespace by name
  for (const ns of Object.keys(map)) {
    map[ns].sort((a, b) => a.name.localeCompare(b.name));
  }
  return map;
}

// ── Colour helpers ─────────────────────────────────────────────────────────

function phaseColor(phase, tokens) {
  switch (phase) {
    case 'Running':   return tokens.statusOnline;
    case 'Pending':   return tokens.statusChecking;
    case 'Failed':    return tokens.statusUnreachable;
    case 'Succeeded': return tokens.statusOnline;
    default:          return tokens.statusNoCheck;
  }
}

// uptimeColor signals crashloop risk based on how recently the container (re)started.
// < 5 min  → red   (actively crashing)
// < 1 hr   → yellow (recently restarted, watch it)
// otherwise → normal
function uptimeColor(secs, tokens) {
  if (secs === 0) return tokens.textMuted;  // not yet running
  if (secs < 300)  return tokens.statusUnreachable;  // < 5 min — likely crashlooping
  if (secs < 3600) return tokens.statusChecking;     // < 1 hr — recent restart
  return tokens.text;
}

function formatUptime(secs, restartCount) {
  if (secs === 0) return '—';
  let label;
  if (secs < 60)          label = `${secs}s`;
  else if (secs < 3600)   label = `${Math.floor(secs / 60)}m`;
  else if (secs < 86400)  label = `${Math.floor(secs / 3600)}h`;
  else                    label = `${Math.floor(secs / 86400)}d`;
  return restartCount > 0 ? `up ${label} (${restartCount}r)` : `up ${label}`;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function PodsTab() {
  const { tokens } = useTheme();
  const [state, dispatch] = useReducer(reducer, { loading: true, error: null, pods: [], grouped: {} });

  const fetchPods = useCallback(() => {
    dispatch({ type: 'START_LOADING' });
    fetch('/api/k8s/pods/all')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((pods) => dispatch({ type: 'SET_DATA', pods }))
      .catch((e) => dispatch({ type: 'SET_ERROR', error: e.message || 'fetch error' }));
  }, []);

  useEffect(() => {
    fetchPods();
    // Optional 30s auto-refresh
    const id = setInterval(fetchPods, 30_000);
    return () => clearInterval(id);
  }, [fetchPods]);

  // ── Styles ──────────────────────────────────────────────────────────────

  const containerStyle = { padding: '1rem 0', fontFamily: tokens.fontFamily };
  const headerStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '0.75rem',
  };
  const refreshBtnStyle = {
    background: 'transparent', border: `1px solid ${tokens.border}`,
    borderRadius: '4px', color: tokens.textMuted, cursor: 'pointer',
    fontSize: '0.78rem', padding: '0.25rem 0.7rem', fontFamily: tokens.fontFamily,
  };
  const nsHeaderStyle = {
    color: tokens.accent, fontSize: '0.75rem', letterSpacing: '0.08em',
    textTransform: 'uppercase', borderBottom: `1px solid ${tokens.border}`,
    paddingBottom: '0.3rem', marginBottom: '0.4rem', marginTop: '1.2rem',
  };
  const tableStyle = { width: '100%', borderCollapse: 'collapse', color: tokens.text };
  const thStyle = {
    padding: '0.4rem 0.6rem', textAlign: 'left', color: tokens.textMuted,
    fontSize: '0.72rem', fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: '0.05em', borderBottom: `1px solid ${tokens.border}`,
  };
  const tdStyle = {
    padding: '0.45rem 0.6rem', fontSize: '0.82rem',
    borderBottom: `1px solid ${tokens.border}`,
  };

  // ── Render ──────────────────────────────────────────────────────────────

  if (state.loading) {
    return (
      <div style={{ ...containerStyle, color: tokens.textMuted }}>
        Loading pods…
      </div>
    );
  }

  if (state.error) {
    return (
      <div style={{ ...containerStyle, color: tokens.statusUnreachable }}>
        Error fetching pods: {state.error}
      </div>
    );
  }

  const namespaces = Object.keys(state.grouped).sort();

  return (
    <div style={containerStyle} data-testid="pods-tab">
      <div style={headerStyle}>
        <span style={{ color: tokens.textMuted, fontSize: '0.8rem' }}>
          {state.pods.length} pods across {namespaces.length} namespaces
        </span>
        <button style={refreshBtnStyle} onClick={fetchPods}>↻ Refresh</button>
      </div>

      {namespaces.map((ns) => (
        <div key={ns} data-testid={`ns-${ns}`}>
          <h3 style={nsHeaderStyle}>{ns}</h3>
          <table style={tableStyle} role="table">
            <thead>
              <tr>
                <th style={thStyle}>Pod</th>
                <th style={thStyle}>Phase</th>
                <th style={thStyle}>Ready</th>
                <th style={thStyle}>Uptime</th>
                <th style={thStyle}>Age</th>
                <th style={thStyle}>Node</th>
              </tr>
            </thead>
            <tbody>
              {state.grouped[ns].map((pod) => (
                <tr key={pod.name} data-testid={`pod-${pod.name}`}>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.78rem' }}>{pod.name}</td>
                  <td style={{ ...tdStyle, color: phaseColor(pod.phase, tokens), fontWeight: '500' }}>
                    {pod.phase}
                  </td>
                  <td style={{ ...tdStyle, color: pod.ready ? tokens.statusOnline : tokens.statusUnreachable }}>
                    {pod.ready ? '\u2713' : '\u2717'}
                  </td>
                  <td style={{ ...tdStyle, color: uptimeColor(pod.containerUptimeSecs, tokens), fontWeight: pod.containerUptimeSecs > 0 && pod.containerUptimeSecs < 300 ? '700' : '400' }}>
                    {formatUptime(pod.containerUptimeSecs, pod.restartCount)}
                    {pod.containerUptimeSecs > 0 && pod.containerUptimeSecs < 300 && ' \u26A0'}
                  </td>
                  <td style={{ ...tdStyle, color: tokens.textMuted }}>{pod.age}</td>
                  <td style={{ ...tdStyle, color: tokens.textMuted, fontSize: '0.75rem' }}>{pod.nodeName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {namespaces.length === 0 && (
        <div style={{ color: tokens.textMuted, fontSize: '0.85rem' }}>No pods found.</div>
      )}
    </div>
  );
}
