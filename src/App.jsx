import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from './context/ThemeContext.jsx';
import Header from './components/Header.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import RefreshButton from './components/RefreshButton.jsx';
import ServiceGrid from './components/ServiceGrid.jsx';
import { SERVICES } from './config/services.js';
import { STATUS } from './constants/status.js';

function buildInitialStatusMap() {
  return SERVICES.reduce((acc, s) => {
    acc[s.id] = s.healthCheck.enabled ? STATUS.CHECKING : STATUS.NO_CHECK;
    return acc;
  }, {});
}

async function checkOne(service) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 5000);
  try {
    await fetch(service.healthCheck.url, { signal: controller.signal, mode: 'no-cors' });
    return { id: service.id, status: STATUS.ONLINE };
  } catch {
    return { id: service.id, status: STATUS.UNREACHABLE };
  } finally {
    clearTimeout(t);
  }
}

function App() {
  const { tokens } = useTheme();
  const [statusMap, setStatusMap] = useState(buildInitialStatusMap);
  const [isPolling, setIsPolling] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  const checkAllServices = useCallback(async () => {
    setIsPolling(true);
    const enabled = SERVICES.filter((s) => s.healthCheck.enabled);
    const results = await Promise.allSettled(enabled.map(checkOne));
    setStatusMap((prev) => {
      const next = { ...prev };
      for (const r of results) {
        if (r.status === 'fulfilled') next[r.value.id] = r.value.status;
        else if (r.reason?.id) next[r.reason.id] = STATUS.UNREACHABLE;
      }
      return next;
    });
    setLastChecked(new Date());
    setIsPolling(false);
  }, []);

  useEffect(() => {
    checkAllServices();
    const id = setInterval(checkAllServices, 30000);
    return () => clearInterval(id);
  }, [checkAllServices]);

  const handleRefresh = useCallback(() => {
    const checkingMap = SERVICES.reduce((acc, s) => {
      acc[s.id] = s.healthCheck.enabled ? STATUS.CHECKING : STATUS.NO_CHECK;
      return acc;
    }, {});
    setStatusMap(checkingMap);
    checkAllServices();
  }, [checkAllServices]);

  const totalCount = SERVICES.filter((s) => s.healthCheck.enabled).length;
  const onlineCount = Object.values(statusMap).filter((s) => s === STATUS.ONLINE).length;
  const unreachableCount = Object.values(statusMap).filter((s) => s === STATUS.UNREACHABLE).length;

  return (
    <div className="app" style={{ background: tokens.bg, color: tokens.text, minHeight: '100vh' }}>
      {tokens.scanlines && (
        <div
          className="scanlines-overlay"
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 9999,
            background:
              'repeating-linear-gradient(transparent 0px, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)',
          }}
        />
      )}
      <Header
        onlineCount={onlineCount}
        totalCount={totalCount}
        unreachableCount={unreachableCount}
        lastChecked={lastChecked}
        isPolling={isPolling}
      />
      <ThemeToggle />
      <RefreshButton onRefresh={handleRefresh} isPolling={isPolling} />
      <ServiceGrid services={SERVICES} statusMap={statusMap} />
    </div>
  );
}

export default App;
