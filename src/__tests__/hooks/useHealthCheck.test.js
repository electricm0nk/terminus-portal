import { renderHook, waitFor } from '@testing-library/react';
import { useHealthCheck } from '../../hooks/useHealthCheck.js';
import { STATUS } from '../../constants/status.js';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useHealthCheck', () => {
  it('returns NO_CHECK immediately when enabled=false, never calls fetch', () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    const { result } = renderHook(() => useHealthCheck('https://test', false));
    expect(result.current).toBe(STATUS.NO_CHECK);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns ONLINE when fetch resolves (opaque response)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ type: 'opaque' }));
    const { result } = renderHook(() => useHealthCheck('https://test', true));
    expect(result.current).toBe(STATUS.CHECKING);
    await waitFor(() => expect(result.current).toBe(STATUS.ONLINE));
  });

  it('returns UNREACHABLE when fetch throws TypeError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const { result } = renderHook(() => useHealthCheck('https://test', true));
    await waitFor(() => expect(result.current).toBe(STATUS.UNREACHABLE));
  });

  it('returns UNREACHABLE when AbortController fires (AbortError)', async () => {
    const err = new DOMException('Aborted', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(err));
    const { result } = renderHook(() => useHealthCheck('https://test', true));
    await waitFor(() => expect(result.current).toBe(STATUS.UNREACHABLE));
  });

  it('no state update after unmount', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let resolveRef;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => new Promise((res) => { resolveRef = res; }))
    );
    const { result, unmount } = renderHook(() => useHealthCheck('https://test', true));
    unmount();
    resolveRef({ type: 'opaque' });
    await new Promise((r) => setTimeout(r, 10));
    const actWarnings = consoleSpy.mock.calls.filter((c) =>
      typeof c[0] === 'string' && c[0].includes('act')
    );
    expect(actWarnings).toHaveLength(0);
    consoleSpy.mockRestore();
  });
});
