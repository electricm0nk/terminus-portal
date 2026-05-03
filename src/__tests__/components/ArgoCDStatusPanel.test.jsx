import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ArgoCDStatusPanel from '../../components/ArgoCDStatusPanel.jsx';
import { ThemeProvider } from '../../context/ThemeContext.jsx';

function Wrapper({ children }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function renderPanel() {
  return render(<ArgoCDStatusPanel />, { wrapper: Wrapper });
}

const mockData = {
  total: 61,
  synced: 53,
  outOfSync: 8,
  healthy: 59,
  degraded: 2,
  progressing: 0,
  suspended: 0,
  missing: 0,
  unknown: 0,
};

beforeEach(() => {
  vi.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => mockData,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ArgoCDStatusPanel', () => {
  it('renders the panel container', () => {
    renderPanel();
    expect(screen.getByTestId('argocd-status-panel')).toBeDefined();
  });

  it('shows loading state initially', () => {
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {})); // never resolves
    renderPanel();
    expect(screen.getByText('Loading…')).toBeDefined();
  });

  it('displays synced and out-of-sync counts', async () => {
    renderPanel();
    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull());
    expect(screen.getByTestId('argocd-sync-synced').textContent).toContain('53');
    expect(screen.getByTestId('argocd-sync-out-of-sync').textContent).toContain('8');
  });

  it('displays healthy and degraded counts', async () => {
    renderPanel();
    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull());
    expect(screen.getByTestId('argocd-health-healthy').textContent).toContain('59');
    expect(screen.getByTestId('argocd-health-degraded').textContent).toContain('2');
  });

  it('shows total app count in title', async () => {
    renderPanel();
    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull());
    expect(screen.getByTestId('argocd-status-panel').textContent).toContain('61 apps');
  });

  it('shows error when fetch fails', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('upstream down'));
    renderPanel();
    await waitFor(() => expect(screen.queryByText(/upstream down/i)).toBeTruthy());
  });

  it('shows error when response is not ok', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 502 });
    renderPanel();
    await waitFor(() => expect(screen.queryByText(/HTTP 502/i)).toBeTruthy());
  });

  it('polls again after 60 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderPanel();
    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull());
    const callCount = global.fetch.mock.calls.length;
    await act(async () => { vi.advanceTimersByTime(60_000); });
    await waitFor(() => expect(global.fetch.mock.calls.length).toBeGreaterThan(callCount));
    vi.useRealTimers();
  });
});
