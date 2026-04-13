export const METRICS = [
  { id: 'cpu-load', label: 'CPU Load', unit: '%', source: 'prometheus', value: null, wired: false },
  { id: 'mem-used', label: 'Memory Used', unit: 'GB', source: 'prometheus', value: null, wired: false },
  { id: 'net-in', label: 'Net In', unit: 'Mbps', source: 'prometheus', value: null, wired: false },
  { id: 'net-out', label: 'Net Out', unit: 'Mbps', source: 'prometheus', value: null, wired: false },
  { id: 'pods-running', label: 'Pods Running', unit: '', source: 'influxdb', value: null, wired: false },
  { id: 'disk-used', label: 'Disk Used', unit: 'GB', source: 'influxdb', value: null, wired: false },
];
