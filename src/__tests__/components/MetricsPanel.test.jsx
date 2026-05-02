import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import MetricsPanel from '../../components/MetricsPanel.jsx';
import { ThemeProvider } from '../../context/ThemeContext.jsx';
import { METRICS } from '../../config/metrics.js';

beforeEach(() => {
  localStorage.clear();
  // Default: fetch returns no-data Prometheus response (panel renders N/A)
  vi.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({ status: 'success', data: { resultType: 'vector', result: [] } }),
  });
});

afterEach(() => vi.restoreAllMocks());

function wrap(metrics = METRICS) {
  return render(
    <ThemeProvider>
      <MetricsPanel metrics={metrics} />
    </ThemeProvider>
  );
}

describe('MetricsPanel', () => {
  it('renders exactly 3 MetricCard children (cpu-load, mem-used, pods-running)', () => {
    wrap();
    const cards = METRICS.map((m) => screen.getByText(m.label));
    expect(cards).toHaveLength(3);
  });

  it('has a heading containing "PLATFORM METRICS"', () => {
    wrap();
    expect(screen.getByRole('heading', { name: /platform metrics/i })).toBeInTheDocument();
  });

  it('renders a section with aria-label "Platform Metrics"', () => {
    wrap();
    expect(screen.getByRole('region', { name: /platform metrics/i })).toBeInTheDocument();
  });

  it('each card receives the correct metric label', () => {
    wrap();
    METRICS.forEach((m) => {
      expect(screen.getByText(m.label)).toBeInTheDocument();
    });
  });

  it('panel styles have no hardcoded hex colors', () => {
    const { container } = wrap();
    const section = container.querySelector('section');
    expect(section.style.color ?? '').not.toMatch(/#[0-9a-fA-F]{3,6}/);
    expect(section.style.background ?? '').not.toMatch(/#[0-9a-fA-F]{3,6}/);
  });

  it('fetches live values from /api/metrics/query for each wired metric', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      const query = new URL(url, 'http://localhost').searchParams.get('query');
      let value = '0';
      if (query && query.includes('node_cpu')) value = '42.56';
      if (query && query.includes('node_memory')) value = '67.3';
      if (query && query.includes('kube_pod')) value = '21';
      return Promise.resolve({
        ok: true,
        json: async () => ({
          status: 'success',
          data: { resultType: 'vector', result: [{ metric: {}, value: [1234567890, value] }] },
        }),
      });
    });
    wrap();
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });
});

