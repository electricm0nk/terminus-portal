import { render, screen } from '@testing-library/react';
import React from 'react';
import StatusIndicator from '../../components/StatusIndicator.jsx';
import { ThemeProvider } from '../../context/ThemeContext.jsx';
import { STATUS } from '../../constants/status.js';

beforeEach(() => localStorage.clear());

function wrap(ui) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('StatusIndicator', () => {
  it('ONLINE — aria-label + role', () => {
    wrap(<StatusIndicator status={STATUS.ONLINE} />);
    const el = screen.getByRole('status', { name: 'Status: Online' });
    expect(el).toBeInTheDocument();
  });

  it('UNREACHABLE — aria-label + role', () => {
    wrap(<StatusIndicator status={STATUS.UNREACHABLE} />);
    expect(screen.getByRole('status', { name: 'Status: Unreachable' })).toBeInTheDocument();
  });

  it('CHECKING — aria-label + role', () => {
    wrap(<StatusIndicator status={STATUS.CHECKING} />);
    expect(screen.getByRole('status', { name: 'Status: Checking' })).toBeInTheDocument();
  });

  it('NO_CHECK — aria-label + role', () => {
    wrap(<StatusIndicator status={STATUS.NO_CHECK} />);
    expect(screen.getByRole('status', { name: 'Status: No health check' })).toBeInTheDocument();
  });

  it('ONLINE uses statusOnline token color (checks inline style)', () => {
    const { container } = wrap(<StatusIndicator status={STATUS.ONLINE} />);
    const el = container.querySelector('[role="status"]');
    // Color is applied via inline style — verify it's present and non-empty
    expect(el.style.color).toBeTruthy();
  });
});
