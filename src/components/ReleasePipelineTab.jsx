import React, { useEffect, useReducer, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { REPOS } from '../config/releasePipeline.js';

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

const INITIAL_STATE = { data: {}, deployedTags: {}, loading: true, error: null };

function reducer(state, action) {
  switch (action.type) {
    case 'START_LOADING':
      return { ...state, loading: true, error: null };
    case 'SET_ROW':
      return { ...state, data: { ...state.data, [action.key]: action.payload } };
    case 'SET_DEPLOYED_TAGS':
      return { ...state, deployedTags: action.payload };
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

    // Fetch deployed image tags from terminus.infra
    fetches.push(
      fetch('/api/infra/deployed-tags')
        .then((r) => r.json())
        .then((d) => dispatch({ type: 'SET_DEPLOYED_TAGS', payload: d.tags || {} }))
        .catch(() => {})
    );

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

  function renderReleasedTagCell(rowData) {
    if (!rowData || rowData.error) return <td style={tdStyle}>—</td>;
    return <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.8rem' }}>{rowData.tag || '—'}</td>;
  }

  function renderDeployedTagCell(tag) {
    if (!tag) return <td style={{ ...tdStyle, color: tokens.textMuted }}>—</td>;
    const short = tag.length > 12 ? tag.slice(0, 12) : tag;
    return (
      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.78rem' }} title={tag}>
        {short}
      </td>
    );
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
            <th style={thStyle}>Release Tag</th>
            <th style={thStyle}>Dev SHA</th>
            <th style={thStyle}>Dev Deployed</th>
            <th style={thStyle}>Prod SHA</th>
            <th style={thStyle}>Prod Deployed</th>
          </tr>
        </thead>
        <tbody>
          {REPOS.map(({ owner, repo, displayName, branches }) => {
            const devKey  = branches.dev  ? buildKey(owner, repo, branches.dev)  : null;
            const prodKey = branches.prod ? buildKey(owner, repo, branches.prod) : null;
            const devData  = devKey  ? state.data[devKey]  : null;
            const prodData = prodKey ? state.data[prodKey] : null;
            // Use prod data as canonical source for the release tag
            const tagSource = prodData || devData;
            const deployedEntry = state.deployedTags[repo] || {};

            return (
              <tr key={`${owner}/${repo}`} data-testid={`row-${repo}`}>
                <td style={{ ...tdStyle, fontWeight: '500' }}>
                  <a href={`https://github.com/${owner}/${repo}`} style={linkStyle}
                     target="_blank" rel="noreferrer">
                    {displayName}
                  </a>
                </td>
                {renderReleasedTagCell(tagSource)}
                {devKey  ? renderSHACell(owner, repo, devData)  : <td style={tdStyle}>—</td>}
                {renderDeployedTagCell(deployedEntry.dev)}
                {prodKey ? renderSHACell(owner, repo, prodData) : <td style={tdStyle}>—</td>}
                {renderDeployedTagCell(deployedEntry.prod)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
