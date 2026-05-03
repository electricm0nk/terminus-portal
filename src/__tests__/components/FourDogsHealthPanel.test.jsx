import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import FourDogsHealthPanel from '../../components/FourDogsHealthPanel.jsx';
import { ThemeProvider } from '../../context/ThemeContext.jsx';

function Wrapper({ children }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function renderPanel(props = {}) {
  return render(<FourDogsHealthPanel {...props} />, { wrapper: Wrapper });
}

const baseHealth = {
  centralUi:            { status: 'up',    httpStatus: 200, signal: 'UP',         restartCount: 0 },
  centralApi:           { status: 'up',    httpStatus: 200, signal: 'UP',         restartCount: 0 },
  emailfetcher:         { status: 'up',    httpStatus: 200, signal: 'UP',         restartCount: 0 },
  etailpetTrigger:      { status: 'up',    httpStatus: 0,   signal: '1/1 running', restartCount: 0 },
  etailpetSalesTrigger: { status: 'up',    httpStatus: 0,   signal: '1/1 running', restartCount: 0 },
};

beforeEach(() => {
  vi.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => baseHealth,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FourDogsHealthPanel', () => {
  it('renders panel with section title', async () => {
    renderPanel();
    expect(screen.getByTestId('fourdogs-health-panel')).toBeDefined();
    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull());
  });

  it('shows UP for all five service rows when health returns up', async () => {
    renderPanel();
    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull());
    expect(screen.getByTestId('fdh-row-central-ui')).toBeDefined();
    expect(screen.getByTestId('fdh-row-central-api')).toBeDefined();
    expect(screen.getByTestId('fdh-row-emailfetcher')).toBeDefined();
    expect(screen.getByTestId('fdh-row-etailpet-trigger')).toBeDefined();
    expect(screen.getByTestId('fdh-row-etailpet-sales-trigger')).toBeDefined();
  });

  it('shows "no signal" for emailfetcher when status is no-signal', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        ...baseHealth,
        emailfetcher: { status: 'no-signal', httpStatus: 404, signal: 'no signal' },
      }),
    });
    renderPanel();
    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull());
    const row = screen.getByTestId('fdh-row-emailfetcher');
    expect(row.textContent).toContain('no signal');
  });

  it('renders ETailPet trigger rows from health response', async () => {
    renderPanel();
    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull());
    expect(screen.getByTestId('fdh-row-etailpet-trigger')).toBeDefined();
    expect(screen.getByTestId('fdh-row-etailpet-sales-trigger')).toBeDefined();
    expect(screen.getByTestId('fdh-row-etailpet-trigger').textContent).toContain('1/1 running');
  });

  it('shows restart warning when restartCount > 5 from health response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        ...baseHealth,
        etailpetTrigger: { status: 'up', httpStatus: 0, signal: '1/1 running', restartCount: 8 },
      }),
    });
    renderPanel();
    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull());
    expect(screen.getByTestId('fdh-row-etailpet-trigger').textContent).toContain('⚠');
  });

  it('shows error message when fetch fails', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network failure'));
    renderPanel();
    await waitFor(() => expect(screen.queryByText(/network failure/i)).toBeTruthy());
  });
});
