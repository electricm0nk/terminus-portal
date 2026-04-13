import { render, screen } from '@testing-library/react';
import React from 'react';
import Header from '../../components/Header.jsx';
import { ThemeProvider } from '../../context/ThemeContext.jsx';
import { STATUS } from '../../constants/status.js';

beforeEach(() => localStorage.clear());

function wrap(props) {
  return render(
    <ThemeProvider>
      <Header {...props} />
    </ThemeProvider>
  );
}

describe('Header health summary', () => {
  it('shows "8/8 ONLINE" when all enabled services are online', () => {
    wrap({ onlineCount: 8, totalCount: 8, unreachableCount: 0, lastChecked: null, isPolling: false });
    expect(screen.getByText('8/8 ONLINE')).toBeInTheDocument();
  });

  it('shows "6/8 ONLINE" with unreachable badge when 2 unreachable', () => {
    wrap({ onlineCount: 6, totalCount: 8, unreachableCount: 2, lastChecked: null, isPolling: false });
    expect(screen.getByText('6/8 ONLINE')).toBeInTheDocument();
    expect(screen.getByText('2 UNREACHABLE')).toBeInTheDocument();
  });

  it('shows "Checking..." when isPolling=true and onlineCount=0', () => {
    wrap({ onlineCount: 0, totalCount: 8, unreachableCount: 0, lastChecked: null, isPolling: true });
    expect(screen.getByText('Checking...')).toBeInTheDocument();
  });

  it('shows "Last checked: ..." when lastChecked is a Date', () => {
    const d = new Date(2026, 3, 13, 10, 30, 0);
    wrap({ onlineCount: 8, totalCount: 8, unreachableCount: 0, lastChecked: d, isPolling: false });
    expect(screen.getByText(/last checked/i)).toBeInTheDocument();
  });

  it('hides last-checked line when lastChecked is null', () => {
    wrap({ onlineCount: 8, totalCount: 8, unreachableCount: 0, lastChecked: null, isPolling: false });
    expect(screen.queryByText(/last checked/i)).toBeNull();
  });
});
