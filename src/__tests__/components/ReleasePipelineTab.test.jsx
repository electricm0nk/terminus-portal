import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import ReleasePipelineTab from '../../components/ReleasePipelineTab.jsx';
import { ThemeProvider } from '../../context/ThemeContext.jsx';

beforeEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
});

function wrap(ui) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const MOCK_BRANCH_DATA = {
  branch: 'main',
  sha: 'abcdef1234567',
  message: 'chore: bump version',
  age: '2h ago',
  tag: 'v1.2.3',
  ciStatus: 'success',
  ciRunUrl: 'https://github.com/electricm0nk/terminus-portal/actions/runs/123',
};

describe('ReleasePipelineTab', () => {
  it('shows loading state before fetch completes', () => {
    global.fetch = vi.fn(() => new Promise(() => {})); // never resolves
    wrap(<ReleasePipelineTab />);
    expect(screen.getByText(/loading release pipeline/i)).toBeInTheDocument();
  });

  it('renders the release pipeline table after fetch', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve(MOCK_BRANCH_DATA) })
    );
    wrap(<ReleasePipelineTab />);

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    // Table headers present
    expect(screen.getByText('Repo')).toBeInTheDocument();
    expect(screen.getByText('Tag')).toBeInTheDocument();
    expect(screen.getByText('Dev SHA')).toBeInTheDocument();
    expect(screen.getByText('Prod SHA')).toBeInTheDocument();
    expect(screen.getByText('Dev CI')).toBeInTheDocument();
    expect(screen.getByText('Prod CI')).toBeInTheDocument();
  });

  it('renders a row for each configured repo', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve(MOCK_BRANCH_DATA) })
    );
    wrap(<ReleasePipelineTab />);

    await waitFor(() => {
      expect(screen.getByTestId('row-terminus-portal')).toBeInTheDocument();
    });

    expect(screen.getByTestId('row-fourdogs-central')).toBeInTheDocument();
    expect(screen.getByTestId('row-fourdogs-kaylee-agent')).toBeInTheDocument();
    expect(screen.getByTestId('row-terminus-inference-gateway')).toBeInTheDocument();
  });

  it('shows fetch error text in cells when API returns error', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({ error: 'rate limited' }) })
    );
    wrap(<ReleasePipelineTab />);

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
    // error text is shown in at least one cell
    const errorCells = screen.getAllByText('rate limited');
    expect(errorCells.length).toBeGreaterThan(0);
  });

  it('shows SHA links linking to GitHub commit page', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve(MOCK_BRANCH_DATA) })
    );
    wrap(<ReleasePipelineTab />);

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    // find at least one link containing /commit/
    const shaLinks = screen.getAllByRole('link').filter(l =>
      l.href && l.href.includes('/commit/')
    );
    expect(shaLinks.length).toBeGreaterThan(0);
    expect(shaLinks[0].textContent).toBe('abcdef1'); // first 7 chars
  });

  it('refresh button triggers re-fetch', async () => {
    let callCount = 0;
    global.fetch = vi.fn(() => {
      callCount++;
      return Promise.resolve({ json: () => Promise.resolve(MOCK_BRANCH_DATA) });
    });
    wrap(<ReleasePipelineTab />);

    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());

    const initialCalls = callCount;
    fireEvent.click(screen.getByText(/↻ Refresh/));

    await waitFor(() => expect(callCount).toBeGreaterThan(initialCalls));
  });
});
