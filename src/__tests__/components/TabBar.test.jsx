import { render, screen, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';
import TabBar from '../../components/TabBar.jsx';
import { ThemeProvider } from '../../context/ThemeContext.jsx';

beforeEach(() => localStorage.clear());

function wrap(ui) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

// Controlled wrapper so we can test tab switching
function ControlledTabBar() {
  const [activeTab, setActiveTab] = useState('overview');
  return (
    <>
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <div data-testid="active-tab">{activeTab}</div>
    </>
  );
}

describe('TabBar', () => {
  it('renders three tabs: Overview, Release Pipeline, Pods', () => {
    wrap(<ControlledTabBar />);
    expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /release pipeline/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /pods/i })).toBeInTheDocument();
  });

  it('Overview tab is selected by default', () => {
    wrap(<ControlledTabBar />);
    expect(screen.getByRole('tab', { name: /overview/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /release pipeline/i })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: /pods/i })).toHaveAttribute('aria-selected', 'false');
  });

  it('clicking Release Pipeline tab updates the active tab', () => {
    wrap(<ControlledTabBar />);
    fireEvent.click(screen.getByRole('tab', { name: /release pipeline/i }));
    expect(screen.getByTestId('active-tab').textContent).toBe('release-pipeline');
    expect(screen.getByRole('tab', { name: /release pipeline/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /overview/i })).toHaveAttribute('aria-selected', 'false');
  });

  it('clicking Pods tab updates the active tab', () => {
    wrap(<ControlledTabBar />);
    fireEvent.click(screen.getByRole('tab', { name: /pods/i }));
    expect(screen.getByTestId('active-tab').textContent).toBe('pods');
    expect(screen.getByRole('tab', { name: /pods/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('tab bar has accessible tablist role', () => {
    wrap(<ControlledTabBar />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });
});
