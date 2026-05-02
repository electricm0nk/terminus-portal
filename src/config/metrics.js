// Live Prometheus metrics — wired via /api/metrics/query (sidecar Prometheus proxy)
export const METRICS = [
  {
    id: 'cpu-load',
    label: 'CPU Load',
    unit: '%',
    source: 'prometheus',
    query: '100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)',
    wired: true,
    value: null,
  },
  {
    id: 'mem-used',
    label: 'Memory Used',
    unit: '%',
    source: 'prometheus',
    query: '(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100',
    wired: true,
    value: null,
  },
  {
    id: 'pods-running',
    label: 'Pods Running',
    unit: '',
    source: 'prometheus',
    query: 'count(kube_pod_status_phase{phase="Running"})',
    wired: true,
    value: null,
  },
];
