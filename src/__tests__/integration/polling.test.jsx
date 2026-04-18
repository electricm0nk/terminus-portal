import { render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import App from '../../App.jsx';
import { ThemeProvider } from '../../context/ThemeContext.jsx';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function wrap(ui) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('App polling integration', () => {
  it('ArgoCD card shows ONLINE when fetch resolves', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ type: 'opaque' })
    );
    wrap(<App />);
    const argoCard = document.querySelector('[data-testid="service-card-argocd"]');
    await waitFor(() => {
      expect(within(argoCard).getByRole('status', { name: 'Status: Online' })).toBeInTheDocument();
    });
  });

  it('Vault card shows UNREACHABLE when fetch rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url) => {
        if (url.includes('vault')) return Promise.reject(new TypeError('Network error'));
        return Promise.resolve({ type: 'opaque' });
      })
    );
    wrap(<App />);
    const vaultCard = document.querySelector('[data-testid="service-card-vault"]');
    await waitFor(() => {
      expect(
        within(vaultCard).getByRole('status', { name: 'Status: Unreachable' })
      ).toBeInTheDocument();
    });
  });

  it('Fourdogs card shows ONLINE when fetch resolves (healthCheck enabled)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ type: 'opaque' }));
    wrap(<App />);
    const fourdogsCard = document.querySelector('[data-testid="service-card-fourdogs"]');
    await waitFor(() => {
      expect(
        within(fourdogsCard).getByRole('status', { name: 'Status: Online' })
      ).toBeInTheDocument();
    });
  });
});
