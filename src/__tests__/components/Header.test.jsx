import { render, screen } from '@testing-library/react';
import React from 'react';
import Header from '../../components/Header.jsx';
import { ThemeProvider } from '../../context/ThemeContext.jsx';

beforeEach(() => localStorage.clear());

function wrap(props = {}) {
  return render(
    <ThemeProvider>
      <Header {...props} />
    </ThemeProvider>
  );
}

describe('Header identity', () => {
  it('renders platform name', () => {
    wrap();
    expect(screen.getByText(/terminus platform portal/i)).toBeInTheDocument();
  });

  it('renders cluster name "trantor"', () => {
    wrap();
    expect(screen.getByText(/trantor/i)).toBeInTheDocument();
  });

  it('renders domain "hintzmann.net"', () => {
    wrap();
    expect(screen.getByText(/hintzmann\.net/i)).toBeInTheDocument();
  });

  it('renders technology "k3s"', () => {
    wrap();
    expect(screen.getByText(/k3s/i)).toBeInTheDocument();
  });

  it('root is <header> with role="banner"', () => {
    wrap();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('banner').tagName).toBe('HEADER');
  });
});
