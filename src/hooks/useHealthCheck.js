import { useState, useEffect } from 'react';
import { STATUS } from '../constants/status.js';

export function useHealthCheck(url, enabled) {
  const [status, setStatus] = useState(enabled ? STATUS.CHECKING : STATUS.NO_CHECK);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;
    let intervalId;
    let controller;

    async function check() {
      controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      try {
        await fetch(url, { signal: controller.signal, mode: 'no-cors' });
        if (mounted) setStatus(STATUS.ONLINE);
      } catch {
        if (mounted) setStatus(STATUS.UNREACHABLE);
      } finally {
        clearTimeout(timeoutId);
      }
    }

    check();
    intervalId = setInterval(check, 30000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
      if (controller) controller.abort();
    };
  }, [url, enabled]);

  return status;
}
