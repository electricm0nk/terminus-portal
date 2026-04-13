import React from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { STATUS } from '../constants/status.js';

const ARIA_LABELS = {
  [STATUS.ONLINE]: 'Status: Online',
  [STATUS.UNREACHABLE]: 'Status: Unreachable',
  [STATUS.CHECKING]: 'Status: Checking',
  [STATUS.NO_CHECK]: 'Status: No health check',
};

const DISPLAY_LABELS = {
  [STATUS.ONLINE]: 'ONLINE',
  [STATUS.UNREACHABLE]: 'UNREACHABLE',
  [STATUS.CHECKING]: 'CHECKING...',
  [STATUS.NO_CHECK]: 'NO CHECK',
};

export default function StatusIndicator({ status }) {
  const { tokens } = useTheme();

  const tokenMap = {
    [STATUS.ONLINE]: tokens.statusOnline,
    [STATUS.UNREACHABLE]: tokens.statusUnreachable,
    [STATUS.CHECKING]: tokens.statusChecking,
    [STATUS.NO_CHECK]: tokens.statusNoCheck,
  };

  return (
    <span
      role="status"
      aria-label={ARIA_LABELS[status]}
      style={{ color: tokenMap[status], fontFamily: tokens.fontFamily, fontSize: '0.75rem' }}
    >
      ● {DISPLAY_LABELS[status]}
    </span>
  );
}
