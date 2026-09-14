import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../services/apiClient';

export interface AsyncState<T> {
  data: T | null;
  /**
   * True only while there is nothing to show yet — the first load, or a reload
   * caused by the dependencies changing. Deliberately NOT true for a background
   * refresh, so a polling screen never blanks out under the user.
   */
  loading: boolean;
  /** True while a background refresh runs over data that is already on screen. */
  refreshing: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Data fetching for read-only screens.
 *
 * Every screen needs the same states — loading, refreshing, error, empty,
 * loaded — so the mechanics (abort on unmount, refetch on dependency change,
 * error message extraction) live here instead of being re-implemented per page.
 */
export function useAsync<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: unknown[] = [],
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Read the current data inside the effect without making it a dependency.
  const dataRef = useRef<T | null>(null);
  dataRef.current = data;

  const lastTokenRef = useRef(reloadToken);

  useEffect(() => {
    const controller = new AbortController();

    // A bumped reload token with data already on screen is a background
    // refresh. Anything else — first mount, or a dependency change that makes
    // the current data belong to a different resource — is a fresh load.
    const isBackgroundRefresh = lastTokenRef.current !== reloadToken && dataRef.current !== null;
    lastTokenRef.current = reloadToken;

    if (isBackgroundRefresh) {
      setRefreshing(true);
    } else {
      // Clear stale data so a dependency change cannot briefly render the
      // previous resource's content under the new one's heading.
      setData(null);
      dataRef.current = null;
      setLoading(true);
      setError(null);
    }

    fetcherRef
      .current(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        if (caught instanceof DOMException && caught.name === 'AbortError') return;
        // A failed background refresh keeps whatever is already on screen: a
        // single dropped poll should not replace a working page with an error.
        // The next tick will recover, and the user can still refresh by hand.
        if (isBackgroundRefresh) return;
        setError(
          caught instanceof ApiError ? caught.message : 'Something went wrong. Please try again.',
        );
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setLoading(false);
        setRefreshing(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return { data, loading, refreshing, error, reload };
}
