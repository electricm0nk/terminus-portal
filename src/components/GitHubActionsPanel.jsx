import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { GITHUB_ACTIONS_REPOS } from '../config/githubActions.js';

const GITHUB_API = 'https://api.github.com';
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

function summarizeRuns(runs) {
  return runs.reduce(
    (acc, run) => {
      if (run.status === 'queued') acc.queued += 1;
      if (run.status === 'in_progress') acc.running += 1;
      if (run.status === 'completed' && run.conclusion === 'failure') acc.failed += 1;
      if (run.status === 'completed' && run.conclusion === 'success') acc.success += 1;
      return acc;
    },
    { queued: 0, running: 0, failed: 0, success: 0 }
  );
}

function relativeTime(timestamp) {
  if (!timestamp) return 'unknown';
  const deltaSeconds = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
  if (deltaSeconds < 60) return `${deltaSeconds}s ago`;
  if (deltaSeconds < 3600) return `${Math.floor(deltaSeconds / 60)}m ago`;
  return `${Math.floor(deltaSeconds / 3600)}h ago`;
}

function displayRunState(run) {
  if (run.status === 'in_progress') return 'RUNNING';
  if (run.status === 'queued') return 'QUEUED';
  if (run.conclusion === 'success') return 'SUCCESS';
  if (run.conclusion === 'failure') return 'FAILED';
  if (run.conclusion) return run.conclusion.toUpperCase();
  return run.status.toUpperCase();
}

async function fetchRepoRuns(repoConfig) {
  const response = await fetch(`${GITHUB_API}/repos/${repoConfig.repo}/actions/runs?per_page=8`);
  if (!response.ok) {
    throw new Error(`${repoConfig.repo}: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const runs = data.workflow_runs ?? [];

  return {
    ...repoConfig,
    runs,
    summary: summarizeRuns(runs),
  };
}

export default function GitHubActionsPanel() {
  const { tokens } = useTheme();
  const [repoData, setRepoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);

    const results = await Promise.allSettled(GITHUB_ACTIONS_REPOS.map(fetchRepoRuns));
    const successful = results
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value);
    const failures = results
      .filter((result) => result.status === 'rejected')
      .map((result) => result.reason?.message ?? 'GitHub Actions fetch failed');

    setRepoData(successful);
    setLastUpdated(new Date());
    setError(failures.length > 0 ? failures.join(' | ') : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const intervalId = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [refresh]);

  const aggregate = useMemo(
    () =>
      repoData.reduce(
        (acc, repo) => ({
          queued: acc.queued + repo.summary.queued,
          running: acc.running + repo.summary.running,
          failed: acc.failed + repo.summary.failed,
          success: acc.success + repo.summary.success,
        }),
        { queued: 0, running: 0, failed: 0, success: 0 }
      ),
    [repoData]
  );

  const activeRuns = useMemo(
    () =>
      repoData
        .flatMap((repo) =>
          repo.runs
            .filter((run) => run.status === 'queued' || run.status === 'in_progress')
            .map((run) => ({ ...run, repoLabel: repo.label, repoName: repo.repo }))
        )
        .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
        .slice(0, 6),
    [repoData]
  );

  const panelStyle = {
    background: tokens.bgCard,
    border: `1px solid ${tokens.border}`,
    borderRadius: '16px',
    padding: '1rem',
    color: tokens.text,
    fontFamily: tokens.fontFamily,
  };

  const statCardStyle = {
    background: tokens.bgSurface,
    border: `1px solid ${tokens.border}`,
    borderRadius: '12px',
    padding: '0.75rem',
    minWidth: '90px',
  };

  return (
    <section aria-label="GitHub Actions" style={panelStyle}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              color: tokens.accent,
              fontSize: '0.9rem',
              letterSpacing: '0.08em',
            }}
          >
            GITHUB ACTIONS
          </h2>
          <div style={{ color: tokens.textMuted, fontSize: '0.78rem', marginTop: '0.35rem' }}>
            Public GitHub API view for current repo pipelines. Private repos will need a proxy later.
          </div>
        </div>
        <button
          aria-label="Refresh GitHub Actions"
          onClick={refresh}
          disabled={loading}
          style={{
            background: loading ? tokens.accentDim : tokens.bgSurface,
            color: tokens.accent,
            border: `1px solid ${tokens.border}`,
            borderRadius: '10px',
            padding: '0.45rem 0.75rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: tokens.fontFamily,
            fontSize: '0.78rem',
            opacity: loading ? 0.75 : 1,
          }}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        <div style={statCardStyle}>
          <div style={{ color: tokens.accent, fontSize: '1.5rem', fontWeight: 'bold' }}>{aggregate.running}</div>
          <div style={{ color: tokens.textMuted, fontSize: '0.72rem' }}>Running</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ color: tokens.statusChecking, fontSize: '1.5rem', fontWeight: 'bold' }}>{aggregate.queued}</div>
          <div style={{ color: tokens.textMuted, fontSize: '0.72rem' }}>Queued</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ color: tokens.statusUnreachable, fontSize: '1.5rem', fontWeight: 'bold' }}>{aggregate.failed}</div>
          <div style={{ color: tokens.textMuted, fontSize: '0.72rem' }}>Failed</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ color: tokens.statusOnline, fontSize: '1.5rem', fontWeight: 'bold' }}>{aggregate.success}</div>
          <div style={{ color: tokens.textMuted, fontSize: '0.72rem' }}>Recent OK</div>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: '1rem',
            border: `1px solid ${tokens.statusUnreachable}`,
            borderRadius: '12px',
            padding: '0.75rem',
            color: tokens.statusUnreachable,
            fontSize: '0.78rem',
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        {GITHUB_ACTIONS_REPOS.map((repo) => {
          const repoState = repoData.find((entry) => entry.id === repo.id);
          return (
            <a
              key={repo.id}
              href={repo.actionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                textDecoration: 'none',
                color: tokens.text,
                background: tokens.bgSurface,
                border: `1px solid ${tokens.border}`,
                borderRadius: '12px',
                padding: '0.85rem',
              }}
            >
              <div style={{ color: tokens.accent, fontWeight: 'bold' }}>{repo.label}</div>
              <div style={{ color: tokens.textMuted, fontSize: '0.72rem', marginTop: '0.2rem' }}>{repo.repo}</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem', fontSize: '0.72rem' }}>
                <span>Run {repoState?.summary.running ?? 0}</span>
                <span>Queue {repoState?.summary.queued ?? 0}</span>
                <span>Fail {repoState?.summary.failed ?? 0}</span>
              </div>
            </a>
          );
        })}
      </div>

      <div>
        <div style={{ color: tokens.accent, fontSize: '0.8rem', marginBottom: '0.65rem' }}>ACTIVE RUNS</div>
        {activeRuns.length === 0 ? (
          <div style={{ color: tokens.textMuted, fontSize: '0.78rem' }}>
            {loading ? 'Loading workflow activity...' : 'No queued or running workflows right now.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {activeRuns.map((run) => (
              <a
                key={run.id}
                href={run.html_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  textDecoration: 'none',
                  color: tokens.text,
                  background: tokens.bgSurface,
                  border: `1px solid ${tokens.border}`,
                  borderRadius: '12px',
                  padding: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis' }}>{run.name}</div>
                    <div style={{ color: tokens.textMuted, fontSize: '0.72rem', marginTop: '0.25rem' }}>
                      {run.repoLabel} · {run.head_branch} · #{run.run_number}
                    </div>
                  </div>
                  <div
                    style={{
                      color: run.status === 'in_progress' ? tokens.statusOnline : tokens.statusChecking,
                      fontSize: '0.72rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {displayRunState(run)}
                  </div>
                </div>
                <div style={{ color: tokens.textMuted, fontSize: '0.72rem', marginTop: '0.45rem' }}>
                  Updated {relativeTime(run.updated_at)}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {lastUpdated && (
        <div style={{ color: tokens.textMuted, fontSize: '0.72rem', marginTop: '1rem' }}>
          Last synced {relativeTime(lastUpdated)}
        </div>
      )}
    </section>
  );
}
