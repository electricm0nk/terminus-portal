// TDD Red: ThemeContext tests — must fail before context is created
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ThemeProvider, useTheme } from '../../context/ThemeContext.jsx';

describe('useTheme', () => {
  it('throws when called outside ThemeProvider', () => {
    expect(() => renderHook(() => useTheme())).toThrow(
      /ThemeProvider/i
    );
  });

  it('returns { tokens, themeName, toggleTheme } inside provider', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });
    expect(result.current).toHaveProperty('tokens');
    expect(result.current).toHaveProperty('themeName');
    expect(result.current).toHaveProperty('toggleTheme');
  });

  it('default theme is spaceops', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });
    expect(result.current.themeName).toBe('spaceops');
  });
});
