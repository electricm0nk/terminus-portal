import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import RefreshButton from '../../components/RefreshButton.jsx';
import { ThemeProvider } from '../../context/ThemeContext.jsx';

beforeEach(() => localStorage.clear());

function wrap(props) {
  return render(
    <ThemeProvider>
      <RefreshButton {...props} />
    </ThemeProvider>
  );
}

describe('RefreshButton', () => {
  it('has aria-label "Refresh health status"', () => {
    wrap({ onRefresh: vi.fn(), isPolling: false });
    expect(screen.getByRole('button', { name: 'Refresh health status' })).toBeInTheDocument();
  });

  it('is enabled when isPolling=false', () => {
    wrap({ onRefresh: vi.fn(), isPolling: false });
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('is disabled when isPolling=true', () => {
    wrap({ onRefresh: vi.fn(), isPolling: true });
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('clicking button calls onRefresh', () => {
    const onRefresh = vi.fn();
    wrap({ onRefresh, isPolling: false });
    fireEvent.click(screen.getByRole('button'));
    expect(onRefresh).toHaveBeenCalledOnce();
  });
});
