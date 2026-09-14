import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePolling } from './usePolling';

/** Sets the flag without announcing it — no listener runs. */
function stubVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
}

/** Changes visibility the way a browser does, so listeners fire. */
function setVisibility(state: 'visible' | 'hidden') {
  stubVisibility(state);
  document.dispatchEvent(new Event('visibilitychange'));
}

/**
 * Timers are faked, but React flushes state updates on the microtask queue,
 * which is not. Advancing inside an async `act` lets both settle before the
 * assertions run.
 */
async function advance(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

describe('usePolling', () => {
  beforeEach(() => {
    // Only the timer APIs are faked. The defaults also replace `queueMicrotask`,
    // which React uses to flush state updates — with it faked, `act` never
    // settles and every state update inside a tick reports an act warning.
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    });
    stubVisibility('visible');
  });

  afterEach(() => {
    vi.useRealTimers();
    // Reset WITHOUT dispatching: RTL's auto-cleanup has not unmounted yet, so a
    // real visibilitychange here would fire a tick outside act().
    stubVisibility('visible');
  });

  it('does not tick while inactive', async () => {
    const onTick = vi.fn();
    renderHook(() => usePolling(false, onTick, { intervalMs: 1000 }));

    await advance(5000);
    expect(onTick).not.toHaveBeenCalled();
  });

  it('ticks on the interval while active', async () => {
    const onTick = vi.fn();
    renderHook(() => usePolling(true, onTick, { intervalMs: 1000 }));

    await advance(3000);
    expect(onTick).toHaveBeenCalledTimes(3);
  });

  it('skips ticks while the tab is hidden and catches up on return', async () => {
    const onTick = vi.fn();
    renderHook(() => usePolling(true, onTick, { intervalMs: 1000 }));

    await act(async () => setVisibility('hidden'));
    await advance(5000);
    expect(onTick).not.toHaveBeenCalled();

    // Coming back fires one immediate tick rather than a burst of missed ones.
    await act(async () => setVisibility('visible'));
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('stops after maxAttempts and reports that it is exhausted', async () => {
    const onTick = vi.fn();
    const { result } = renderHook(() =>
      usePolling(true, onTick, { intervalMs: 1000, maxAttempts: 3 }),
    );

    await advance(10_000);

    expect(onTick).toHaveBeenCalledTimes(3);
    expect(result.current.exhausted).toBe(true);
  });

  it('resets when polling becomes inactive again', async () => {
    const onTick = vi.fn();
    const { result, rerender } = renderHook(
      ({ active }) => usePolling(active, onTick, { intervalMs: 1000, maxAttempts: 2 }),
      { initialProps: { active: true } },
    );

    await advance(10_000);
    expect(result.current.exhausted).toBe(true);

    // `rerender` is already act-wrapped by RTL; wrapping it again defers the
    // effect's state update past the outer act and trips the act warning.
    rerender({ active: false });
    await advance(0);
    expect(result.current.exhausted).toBe(false);

    rerender({ active: true });
    await advance(2000);
    expect(onTick).toHaveBeenCalledTimes(4);
  });

  it('stops polling on unmount', async () => {
    const onTick = vi.fn();
    const { unmount } = renderHook(() => usePolling(true, onTick, { intervalMs: 1000 }));

    await advance(2000);
    expect(onTick).toHaveBeenCalledTimes(2);

    unmount();
    await advance(5000);
    expect(onTick).toHaveBeenCalledTimes(2);
  });
});
