import React, { useEffect, useReducer, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { REPOS } from '../config/releasePipeline.js';

// ── CI status display helpers ──────────────────────────────────────────────

const CI_ICON = {
  success: { icon: '✓', label: 'success' },
  failure: { icon: '✗', label: 'failure' },
  pending: { icon: '◌', label: 'pending' },
  unknown: { icon: '–', label: 'unknown' },
};

function ciColor(status, tokens) {
  switch (status) {
    case 'success': return tokens.statusOnline;
    case 'failure': return tokens.statusUnreachable;
    case 'pending': return tokens.statusChecking;
    default:        return tokens.statusNoCheck;
  }
}

function shortSHA(sha) {
  return sha ? sha.slice(0, 7) : '';
}

function commitURL(owner, repo, sha) {
  return `https://github.com/${owner}/${repo}/commit/${sha}`;
}

// ── State machine ──────────────────────────────────────────────────────────

function buildKey(owner, repo, branch) {
  return `${owner}/${repo}/${branch}`;
}

const INITIAL_STATE = { data: {}, loading: true, error: null };

function reducer(state, action) {
  switch (action.type) {
    case 'START_LOADING':
      return { ...state, loading: true, error: null };
    case 'SET_ROW':
      return { ...state, data: { ...state.data, [action.key]: action.payload } };
    case 'DONE_LOADING':
      return { ...state, loading: false };
    case 'SET_ERROR':
      return { ...state, loading: false, error: action.error };
    default:
      return state;
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ReleasePipelineTab() {
  const { tokens } = useTheme();
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const fetchAll = useCallback(() => {
    dispatch({ type: 'START_LOADING' });
    const fetches = [];

    for (const { owner, repo, branches } of REPOS) {
      for (const [_slot, branch] of Object.entries(branches)) {
        if (!branch) continue;
        const key = buildKey(owner, repo, branch);
        const url = `/api/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches/${encodeURIComponent(branch)}`;
        fetches.push(
          fetch(url)
            .then((r) => r.json())
            .then((d) => dispatch({ type: 'SET_ROW', key, payload: d }))
            .catch(() => dispatch({ type: 'SET_ROW', key, payload: { error: 'fetch error' } }))
        );
      }
    }

    Promise.allSettled(fetches).then(() => dispatch({ type: 'DONE_LOADING' }));
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Styles ──────────────────────────────────────────────────────────────

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: tokens.fontFamily,
    fontSize: '0.85rem',
    color: tokens.text,
  };
  const thStyle = {
    padding: '0.6rem 0.8rem',
    textAlign: 'left',
    borderBottom: `1px solid ${tokens.border}`,
    color: tokens.textMuted,
    fontWeight: '600',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };
  const tdStyle = {
    padding: '0.55rem 0.8rem',
    borderBottom: `1px solid ${tokens.border}`,
    verticalAlign: 'middle',
  };
  const linkStyle = {
    color: tokens.accent,
    textDecoration: 'none',
    fontFamily: 'monospace',
  };
  const containerStyle = {
    padding: '1rem 0',
    overflowX: 'auto',
  };
  const refreshBtnStyle = {
    marginBottom: '0.75rem',
    background: 'transparent',
    border: `1px solid ${tokens.border}`,
    borderRadius: '4px',
    color: tokens.textMuted,
    cursor: 'pointer',
    fontSize: '0.78rem',
    padding: '0.25rem 0.7rem',
    fontFamily: tokens.fontFamily,
  };

  // ── Render helpers ──────────────────────────────────────────────────────

  function renderCICell(rowData) {
    if (!rowData) return <td style={tdStyle}>—</td>;
    if (rowData.error) return <td style={{ ...tdStyle, color: tokens.statusUnreachable }}>{rowData.error}</td>;
    const { ciStatus, ciRunUrl } = rowData;
    const { icon, label } = CI_ICON[ciStatus] || CI_ICON.unknown;
    const color = ciColor(ciStatus, tokens);
    return (
      <td style={tdStyle}>
        {ciRunUrl
          ? <a href={ciRunUrl} style={{ ...linkStyle, color }} target="_blank" rel="noreferrer" title={label}>{icon}</a>
          : <span style={{ color }}>{icon}</span>}
      </td>
    );
  }

  function renderSHACell(owner, repo, rowData) {
    if (!rowData || rowData.error) return <td style={tdStyle}>—</td>;
    const sha7 = shortSHA(rowData.sha);
    return (
      <td style={tdStyle}>
        <a href={commitURL(owner, repo, rowData.sha)} style={{ ...linkStyle, fontSize: '0.78rem' }}
           target="_blank" rel="noreferrer" title={rowData.message}>
          {sha7}
        </a>
        <span style={{ marginLeft: '0.4rem', color: tokens.textMuted, fontSize: '0.72rem' }}>{rowData.age}</span>
      </td>
    );
  }

  function renderTagCell(rowData) {
    if (!rowData || rowData.error) return <td style={tdStyle}>—</td>;
    return <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.8rem' }}>{rowData.tag || 'no tag'}</td>;
  }

  // ── Render ──────────────────────────────────────────────────────────────

  if (state.loading) {
    return (
      <div style={{ ...containerStyle, color: tokens.textMuted }}>
        Loading release pipeline…
      </div>
    );
  }

  return (
    <div style={containerStyle} data-testid="release-pipeline-tab">
      <button style={refreshBtnStyle} onClick={fetchAll}>↻ Refresh</button>
      <table style={tableStyle} role="table" aria-label="Release pipeline status">
        <thead>
          <tr>
            <th style={thStyle}>Repo</th>
            <th style={thStyle}>Tag</th>
            <th style={thStyle}>Dev SHA</th>
            <th style={thStyle}>Dev CI</th>
            <th style={thStyle}>Prod SHA</th>
            <th style={thStyle}>Prod CI</th>
          </tr>
        </thead>
        <tbody>
          {REPOS.map(({ owner, repo, displayName, branches }) => {
            const devKey  = branches.dev  ? buildKey(owner, repo, branches.dev)  : null;
            const prodKey = branches.prod ? buildKey(owner, repo, branches.prod) : null;
            const devData  = devKey  ? state.data[devKey]  : null;
            const prodData = prodKey ? state.data[prodKey] : null;
            // Use prod tag as the canonical tag row (fallback to dev)
            const tagSource = prodData || devData;

            return (
              <tr key={`${owner}/${repo}`} data-testid={`row-${repo}`}>
                <td style={{ ...tdStyle, fontWeight: '500' }}>
                  <a href={`https://github.com/${owner}/${repo}`} style={linkStyle}
                     target="_blank" rel="noreferrer">
                    {displayName}
                  </a>
                </td>
                {renderTagCell(tagSource)}
                {devKey  ? renderSHACell(owner, repo, devData)  : <td style={tdStyle}>—</td>}
                {devKey  ? renderCICell(devData)                 : <td style={tdStyle}>—</td>}
                {prodKey ? renderSHACell(owner, repo, prodData) : <td style={tdStyle}>—</td>}
                {prodKey ? renderCICell(prodData)                : <td style={tdStyle}>—</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
