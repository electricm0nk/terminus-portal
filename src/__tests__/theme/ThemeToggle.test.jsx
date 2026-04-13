import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import App from '../../App.jsx';
import ThemeToggle from '../../components/ThemeToggle.jsx';
import { ThemeProvider } from '../../context/ThemeContext.jsx';

beforeEach(() => {
  localStorage.clear();
});

function Harness() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}

describe('ThemeToggle aria-label', () => {
  it('shows "Switch to Terminal theme" when spaceops is active (default)', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    expect(screen.getByRole('button', { name: 'Switch to Terminal theme' })).toBeInTheDocument();
  });

  it('shows "Switch to Space Ops theme" when terminal is active', () => {
    localStorage.setItem('terminus-portal-theme', 'terminal');
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    expect(screen.getByRole('button', { name: 'Switch to Space Ops theme' })).toBeInTheDocument();
  });

  it('clicking toggle switches aria-label', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    const btn = screen.getByRole('button', { name: 'Switch to Terminal theme' });
    fireEvent.click(btn);
    expect(screen.getByRole('button', { name: 'Switch to Space Ops theme' })).toBeInTheDocument();
  });
});

describe('Scanline overlay (App-level)', () => {
  it('scanline overlay is NOT in DOM when spaceops is active (default)', () => {
    render(<Harness />);
    expect(document.querySelector('.scanlines-overlay')).toBeNull();
  });

  it('scanline overlay IS in DOM when terminal is active', () => {
    localStorage.setItem('terminus-portal-theme', 'terminal');
    render(<Harness />);
    expect(document.querySelector('.scanlines-overlay')).not.toBeNull();
  });

  it('scanline overlay appears after toggling to terminal, disappears on toggle back', () => {
    render(<Harness />);
    expect(document.querySelector('.scanlines-overlay')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Terminal theme' }));
    expect(document.querySelector('.scanlines-overlay')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Space Ops theme' }));
    expect(document.querySelector('.scanlines-overlay')).toBeNull();
  });
});
