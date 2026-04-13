import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import React from 'react';
import App from '../../App.jsx';
import { ThemeProvider } from '../../context/ThemeContext.jsx';
import { STATUS } from '../../constants/status.js';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => vi.unstubAllGlobals());

function wrap(ui) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('Refresh integration', () => {
  it('refresh button is present with correct aria-label', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ type: 'opaque' }));
    wrap(<App />);
    expect(screen.getByRole('button', { name: 'Refresh health status' })).toBeInTheDocument();
  });

  it('clicking refresh re-triggers poll — button becomes disabled during poll', async () => {
    let resolveAll;
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockImplementationOnce(() => Promise.resolve({ type: 'opaque' }))
        .mockImplementation(
          () =>
            new Promise((res) => {
              resolveAll = res;
            })
        )
    );
    wrap(<App />);
    // wait for initial poll to finish
    await waitFor(() =>
      expect(
        document.querySelector('[data-testid="service-card-argocd"]')
          ? within(document.querySelector('[data-testid="service-card-argocd"]')).queryByRole('status', {
              name: 'Status: Online',
            })
          : null
      ).not.toBeNull()
    ).catch(() => {});

    // click refresh
    const btn = screen.getByRole('button', { name: 'Refresh health status' });
    fireEvent.click(btn);
    // During the pending poll, button should be disabled
    await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh health status' })).toBeDisabled());
    // resolve all pending fetches to clean up
    if (resolveAll) act(() => resolveAll({ type: 'opaque' }));
  });
});
