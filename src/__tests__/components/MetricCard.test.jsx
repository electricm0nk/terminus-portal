import { render, screen } from '@testing-library/react';
import React from 'react';
import MetricCard from '../../components/MetricCard.jsx';
import { ThemeProvider } from '../../context/ThemeContext.jsx';

beforeEach(() => localStorage.clear());

function wrap(metric) {
  return render(
    <ThemeProvider>
      <MetricCard metric={metric} />
    </ThemeProvider>
  );
}

const unwiredMetric = {
  id: 'cpu-load',
  label: 'CPU Load',
  unit: '%',
  source: 'prometheus',
  value: null,
  wired: false,
};

const wiredMetric = {
  id: 'mem-used',
  label: 'Memory Used',
  unit: 'GB',
  source: 'influxdb',
  value: 42,
  wired: true,
};

describe('MetricCard — unwired', () => {
  it('shows dash as value', () => {
    wrap(unwiredMetric);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows "WIRE TO PROMETHEUS TO ENABLE"', () => {
    wrap(unwiredMetric);
    expect(screen.getByText(/wire to prometheus to enable/i)).toBeInTheDocument();
  });

  it('shows label', () => {
    wrap(unwiredMetric);
    expect(screen.getByText('CPU Load')).toBeInTheDocument();
  });

  it('source badge shows "PROMETHEUS"', () => {
    wrap(unwiredMetric);
    expect(screen.getByText('PROMETHEUS')).toBeInTheDocument();
  });
});

describe('MetricCard — wired', () => {
  it('shows value with unit', () => {
    wrap(wiredMetric);
    expect(screen.getByText('42GB')).toBeInTheDocument();
  });

  it('does NOT show "WIRE TO" text', () => {
    wrap(wiredMetric);
    expect(screen.queryByText(/wire to/i)).toBeNull();
  });

  it('shows source badge "INFLUXDB"', () => {
    wrap(wiredMetric);
    expect(screen.getByText('INFLUXDB')).toBeInTheDocument();
  });
});
