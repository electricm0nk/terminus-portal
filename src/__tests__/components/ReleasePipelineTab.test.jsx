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
};

const MOCK_DEPLOYED_TAGS = {
  tags: {
    'terminus-portal': { dev: 'c3e870e3337be590', prod: '0f3e77569fa15d4b' },
  },
};

function makeFetchMock(branchData = MOCK_BRANCH_DATA, deployedTags = MOCK_DEPLOYED_TAGS) {
  return vi.fn((url) => {
    if (url.includes('/api/infra/deployed-tags')) {
      return Promise.resolve({ json: () => Promise.resolve(deployedTags) });
    }
    return Promise.resolve({ json: () => Promise.resolve(branchData) });
  });
}

describe('ReleasePipelineTab', () => {
  it('shows loading state before fetch completes', () => {
    global.fetch = vi.fn(() => new Promise(() => {})); // never resolves
    wrap(<ReleasePipelineTab />);
    expect(screen.getByText(/loading release pipeline/i)).toBeInTheDocument();
  });

  it('renders the release pipeline table after fetch', async () => {
    global.fetch = makeFetchMock();
    wrap(<ReleasePipelineTab />);

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    // Table headers present
    expect(screen.getByText('Repo')).toBeInTheDocument();
    expect(screen.getByText('Release Tag')).toBeInTheDocument();
    expect(screen.getByText('Dev SHA')).toBeInTheDocument();
    expect(screen.getByText('Prod SHA')).toBeInTheDocument();
    expect(screen.getByText('Dev Deployed')).toBeInTheDocument();
    expect(screen.getByText('Prod Deployed')).toBeInTheDocument();
  });

  it('renders a row for each configured repo', async () => {
    global.fetch = makeFetchMock();
    wrap(<ReleasePipelineTab />);

    await waitFor(() => {
      expect(screen.getByTestId('row-terminus-portal')).toBeInTheDocument();
    });

    expect(screen.getByTestId('row-fourdogs-central')).toBeInTheDocument();
    expect(screen.getByTestId('row-fourdogs-kaylee-agent')).toBeInTheDocument();
    expect(screen.getByTestId('row-terminus-inference-gateway')).toBeInTheDocument();
  });

  it('shows dash in cells when branch API returns error', async () => {
    global.fetch = makeFetchMock({ error: 'not found' }, { tags: {} });
    wrap(<ReleasePipelineTab />);

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
    // SHA cells show — for error rows
    const dashCells = screen.getAllByRole('cell').filter(c => c.textContent === '—');
    expect(dashCells.length).toBeGreaterThan(0);
  });

  it('shows SHA links linking to GitHub commit page', async () => {
    global.fetch = makeFetchMock();
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
    global.fetch = vi.fn((url) => {
      callCount++;
      if (url.includes('/api/infra/deployed-tags')) {
        return Promise.resolve({ json: () => Promise.resolve({ tags: {} }) });
      }
      return Promise.resolve({ json: () => Promise.resolve(MOCK_BRANCH_DATA) });
    });
    wrap(<ReleasePipelineTab />);

    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());

    const initialCalls = callCount;
    fireEvent.click(screen.getByText(/↻ Refresh/));

    await waitFor(() => expect(callCount).toBeGreaterThan(initialCalls));
  });
});
