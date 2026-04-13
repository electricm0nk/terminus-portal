import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Header from '../../components/Header.jsx';
import { ThemeProvider } from '../../context/ThemeContext.jsx';

beforeEach(() => localStorage.clear());

function wrap(props = {}) {
  return render(
    <ThemeProvider>
      <Header onRefresh={vi.fn()} isPolling={false} {...props} />
    </ThemeProvider>
  );
}

describe('Header controls', () => {
  it('theme toggle button present with aria-label "Switch to Terminal theme" (spaceops default)', () => {
    wrap();
    expect(screen.getByRole('button', { name: 'Switch to Terminal theme' })).toBeInTheDocument();
  });

  it('refresh button present with aria-label "Refresh health status"', () => {
    wrap();
    expect(screen.getByRole('button', { name: 'Refresh health status' })).toBeInTheDocument();
  });

  it('clicking theme toggle switches aria-label', () => {
    wrap();
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Terminal theme' }));
    expect(screen.getByRole('button', { name: 'Switch to Space Ops theme' })).toBeInTheDocument();
  });

  it('clicking refresh calls onRefresh prop', () => {
    const onRefresh = vi.fn();
    wrap({ onRefresh });
    fireEvent.click(screen.getByRole('button', { name: 'Refresh health status' }));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it('refresh button disabled when isPolling=true', () => {
    wrap({ isPolling: true });
    expect(screen.getByRole('button', { name: 'Refresh health status' })).toBeDisabled();
  });
});
