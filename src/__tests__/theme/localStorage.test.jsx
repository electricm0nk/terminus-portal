import { render, act } from '@testing-library/react';
import React from 'react';
import { ThemeProvider, useTheme } from '../../context/ThemeContext.jsx';

const STORAGE_KEY = 'terminus-portal-theme';

function Inspector({ cb }) {
  const ctx = useTheme();
  cb(ctx);
  return null;
}

beforeEach(() => {
  localStorage.clear();
});

describe('localStorage persistence', () => {
  it('defaults to spaceops when no key stored', () => {
    let result;
    render(
      <ThemeProvider>
        <Inspector cb={(ctx) => { result = ctx; }} />
      </ThemeProvider>
    );
    expect(result.themeName).toBe('spaceops');
  });

  it('restores terminal theme from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'terminal');
    let result;
    render(
      <ThemeProvider>
        <Inspector cb={(ctx) => { result = ctx; }} />
      </ThemeProvider>
    );
    expect(result.themeName).toBe('terminal');
  });

  it('falls back to spaceops for invalid stored value', () => {
    localStorage.setItem(STORAGE_KEY, 'hacker-green');
    let result;
    render(
      <ThemeProvider>
        <Inspector cb={(ctx) => { result = ctx; }} />
      </ThemeProvider>
    );
    expect(result.themeName).toBe('spaceops');
  });

  it('calls localStorage.setItem with correct key/value on toggleTheme', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem');
    let result;
    render(
      <ThemeProvider>
        <Inspector cb={(ctx) => { result = ctx; }} />
      </ThemeProvider>
    );
    act(() => result.toggleTheme());
    expect(spy).toHaveBeenCalledWith(STORAGE_KEY, 'terminal');
    spy.mockRestore();
  });
});
