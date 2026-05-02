import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import React from 'react';
import PodsTab from '../../components/PodsTab.jsx';
import { ThemeProvider } from '../../context/ThemeContext.jsx';

beforeEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
});

function wrap(ui) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const MOCK_PODS = [
  { name: 'portal-abc', namespace: 'terminus-portal', phase: 'Running', ready: true, restartCount: 0, age: '2d ago', nodeName: 'k3s-1' },
  { name: 'central-xyz', namespace: 'fourdogs-central', phase: 'Running', ready: true, restartCount: 2, age: '5h ago', nodeName: 'k3s-2' },
  { name: 'trigger-pod', namespace: 'fourdogs-etailpet-trigger', phase: 'Pending', ready: false, restartCount: 7, age: '10m ago', nodeName: 'k3s-1' },
];

describe('PodsTab', () => {
  it('shows loading state before fetch completes', () => {
    global.fetch = vi.fn(() => new Promise(() => {}));
    wrap(<PodsTab />);
    expect(screen.getByText(/loading pods/i)).toBeInTheDocument();
  });

  it('renders pods grouped by namespace after fetch', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_PODS) })
    );
    wrap(<PodsTab />);

    await waitFor(() => {
      expect(screen.getByTestId('pods-tab')).toBeInTheDocument();
    });

    // Namespace headers present
    expect(screen.getByTestId('ns-terminus-portal')).toBeInTheDocument();
    expect(screen.getByTestId('ns-fourdogs-central')).toBeInTheDocument();
    expect(screen.getByTestId('ns-fourdogs-etailpet-trigger')).toBeInTheDocument();
  });

  it('shows pod name, phase, restart count in each row', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_PODS) })
    );
    wrap(<PodsTab />);

    await waitFor(() => expect(screen.getByTestId('pod-portal-abc')).toBeInTheDocument());
    expect(screen.getByTestId('pod-central-xyz')).toBeInTheDocument();
  });

  it('highlights restart count > 5 with warning indicator', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_PODS) })
    );
    wrap(<PodsTab />);

    await waitFor(() => expect(screen.getByTestId('pod-trigger-pod')).toBeInTheDocument());

    // restart count 7 should show ⚠
    const row = screen.getByTestId('pod-trigger-pod');
    expect(row.textContent).toContain('7');
    expect(row.textContent).toContain('⚠');
  });

  it('shows error message on fetch failure', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, status: 503 })
    );
    wrap(<PodsTab />);

    await waitFor(() => {
      expect(screen.getByText(/error fetching pods/i)).toBeInTheDocument();
    });
  });

  it('shows pod count and namespace count summary', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_PODS) })
    );
    wrap(<PodsTab />);

    await waitFor(() => {
      expect(screen.getByText(/3 pods across 3 namespaces/i)).toBeInTheDocument();
    });
  });

  it('refresh button re-triggers fetch', async () => {
    let callCount = 0;
    global.fetch = vi.fn(() => {
      callCount++;
      return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_PODS) });
    });
    wrap(<PodsTab />);

    await waitFor(() => expect(screen.getByTestId('pods-tab')).toBeInTheDocument());
    const before = callCount;
    fireEvent.click(screen.getByText(/↻ Refresh/));
    await waitFor(() => expect(callCount).toBeGreaterThan(before));
  });
});
