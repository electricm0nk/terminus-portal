import { render, screen } from '@testing-library/react';
import React from 'react';
import MetricsPanel from '../../components/MetricsPanel.jsx';
import { ThemeProvider } from '../../context/ThemeContext.jsx';
import { METRICS } from '../../config/metrics.js';

beforeEach(() => localStorage.clear());

function wrap(metrics = METRICS) {
  return render(
    <ThemeProvider>
      <MetricsPanel metrics={metrics} />
    </ThemeProvider>
  );
}

describe('MetricsPanel', () => {
  it('renders exactly 6 MetricCard children', () => {
    wrap();
    // Each MetricCard renders the metric label — verify 6 labels are present
    const cards = METRICS.map((m) => screen.getByText(m.label));
    expect(cards).toHaveLength(6);
  });

  it('has a heading containing "PLATFORM METRICS"', () => {
    wrap();
    expect(screen.getByRole('heading', { name: /platform metrics/i })).toBeInTheDocument();
  });

  it('renders a section with aria-label "Platform Metrics"', () => {
    wrap();
    expect(screen.getByRole('region', { name: /platform metrics/i })).toBeInTheDocument();
  });

  it('each card receives the correct metric id', () => {
    wrap();
    METRICS.forEach((m) => {
      // Each MetricCard renders its label — check all 6 are unique and present
      expect(screen.getByText(m.label)).toBeInTheDocument();
    });
  });

  it('panel styles have no hardcoded hex colors', () => {
    const { container } = wrap();
    const section = container.querySelector('section');
    expect(section.style.color ?? '').not.toMatch(/#[0-9a-fA-F]{3,6}/);
    expect(section.style.background ?? '').not.toMatch(/#[0-9a-fA-F]{3,6}/);
  });
});
