import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAsync } from './useAsync';
import { ApiError } from '../services/apiClient';

describe('useAsync', () => {
  it('reports loading on the first load, then the data', async () => {
    const fetcher = vi.fn().mockResolvedValue({ value: 1 });
    const { result } = renderHook(() => useAsync(fetcher));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ value: 1 });
    expect(result.current.refreshing).toBe(false);
  });

  /**
   * The regression this hook exists to prevent: a polling screen calls reload()
   * every few seconds, and pages bail out to a full-page spinner while
   * `loading` is true. If a background refresh set `loading`, the whole screen
   * would blank on every tick.
   */
  it('does NOT enter the loading state on a background refresh', async () => {
    const fetcher = vi.fn().mockResolvedValue({ value: 1 });
    const { result } = renderHook(() => useAsync(fetcher));
    await waitFor(() => expect(result.current.data).toEqual({ value: 1 }));

    const loadingStates: boolean[] = [];
    const dataStates: unknown[] = [];

    fetcher.mockResolvedValue({ value: 2 });
    act(() => result.current.reload());

    // Sample the states the UI would see while the refresh is in flight.
    loadingStates.push(result.current.loading);
    dataStates.push(result.current.data);

    await waitFor(() => expect(result.current.data).toEqual({ value: 2 }));
    loadingStates.push(result.current.loading);

    expect(loadingStates.every((value) => value === false)).toBe(true);
    // Data on screen is never replaced by null mid-refresh.
    expect(dataStates.every((value) => value !== null)).toBe(true);
  });

  it('flags a background refresh separately so the UI can show a subtle indicator', async () => {
    let resolveSecond: ((value: unknown) => void) | undefined;
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ value: 1 })
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve; }));

    const { result } = renderHook(() => useAsync(fetcher));
    await waitFor(() => expect(result.current.data).toEqual({ value: 1 }));

    act(() => result.current.reload());
    await waitFor(() => expect(result.current.refreshing).toBe(true));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual({ value: 1 });

    await act(async () => {
      resolveSecond?.({ value: 2 });
    });
    await waitFor(() => expect(result.current.refreshing).toBe(false));
  });

  it('keeps the data on screen when a background refresh fails', async () => {
    const fetcher = vi.fn().mockResolvedValue({ value: 1 });
    const { result } = renderHook(() => useAsync(fetcher));
    await waitFor(() => expect(result.current.data).toEqual({ value: 1 }));

    fetcher.mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', 'Boom'));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.refreshing).toBe(false));

    // A single dropped poll must not replace a working page with an error.
    expect(result.current.data).toEqual({ value: 1 });
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error when the FIRST load fails', async () => {
    const fetcher = vi.fn().mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Quotation not found.'));
    const { result } = renderHook(() => useAsync(fetcher));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Quotation not found.');
    expect(result.current.data).toBeNull();
  });

  it('clears stale data when the dependencies change', async () => {
    const fetcher = vi.fn().mockResolvedValue({ id: 'a' });
    const { result, rerender } = renderHook(({ id }) => useAsync(fetcher, [id]), {
      initialProps: { id: 'a' },
    });
    await waitFor(() => expect(result.current.data).toEqual({ id: 'a' }));

    fetcher.mockResolvedValue({ id: 'b' });
    rerender({ id: 'b' });

    // A different resource is a fresh load, not a refresh: the previous
    // record must not render under the new one's heading.
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();

    await waitFor(() => expect(result.current.data).toEqual({ id: 'b' }));
  });

  it('ignores a response that arrives after unmount', async () => {
    const fetcher = vi.fn().mockResolvedValue({ value: 1 });
    const { unmount } = renderHook(() => useAsync(fetcher));
    unmount();

    // The request is aborted; no state update, so React logs no warning.
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    expect(fetcher.mock.calls[0][0]).toBeInstanceOf(AbortSignal);
    expect((fetcher.mock.calls[0][0] as AbortSignal).aborted).toBe(true);
  });
});
