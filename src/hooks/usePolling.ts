import { useEffect, useRef, useState } from 'react';

interface PollingOptions {
  intervalMs?: number;
  /** Stop after this many ticks, so an abandoned tab does not poll forever. */
  maxAttempts?: number;
}

/**
 * Calls `onTick` on an interval while `active` is true.
 *
 * Three behaviours a bare `setInterval` does not give you:
 *  - ticks are skipped while the tab is hidden (and do not count against
 *    `maxAttempts`), with one immediate tick when the user comes back, so a
 *    backgrounded page neither wastes requests nor shows stale data on return;
 *  - polling stops after `maxAttempts`, and the caller is told, so the UI can
 *    say something more useful than spinning indefinitely;
 *  - the attempt count resets whenever polling is started or stopped.
 */
export function usePolling(
  active: boolean,
  onTick: () => void,
  { intervalMs = 5000, maxAttempts = Number.POSITIVE_INFINITY }: PollingOptions = {},
): { exhausted: boolean } {
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  const [attempts, setAttempts] = useState(0);
  const [previousActive, setPreviousActive] = useState(active);

  // Reset during render rather than in an effect (React's documented pattern for
  // state derived from a prop change). Doing it in an effect would queue an
  // extra commit after the render that turned polling off.
  if (previousActive !== active) {
    setPreviousActive(active);
    setAttempts(0);
  }

  // The interval callback needs the live count without re-creating the interval
  // on every tick, so the ref mirrors the state.
  const attemptsRef = useRef(attempts);
  attemptsRef.current = attempts;

  useEffect(() => {
    if (!active) return undefined;

    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      if (attemptsRef.current >= maxAttempts) return;

      attemptsRef.current += 1;
      setAttempts(attemptsRef.current);
      onTickRef.current();
    };

    const interval = window.setInterval(tick, intervalMs);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [active, intervalMs, maxAttempts]);

  return { exhausted: attempts >= maxAttempts };
}
