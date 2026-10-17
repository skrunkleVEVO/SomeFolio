import { useEffect, useState } from 'react';
import { searchMedia } from '../lib/search';

const IDLE = { results: [], loading: false, error: null };
const OFFLINE_ERROR = "You're offline. Search needs a connection, but your library still works.";

/** Debounced live search in one category's database; cancels in-flight requests as the user keeps typing. */
export function useMediaSearch(query, category, delay = 350) {
  const [state, setState] = useState(IDLE);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setState(IDLE);
      return;
    }
    if (!navigator.onLine) {
      setState({ results: [], loading: false, error: OFFLINE_ERROR });
      return;
    }
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    const timer = setTimeout(async () => {
      try {
        const results = await searchMedia(category, q, { signal: controller.signal });
        setState({ results, loading: false, error: null });
      } catch (err) {
        if (err.name !== 'AbortError') {
          const error = navigator.onLine ? 'Search is unavailable right now. Try again in a moment.' : OFFLINE_ERROR;
          setState({ results: [], loading: false, error });
        }
      }
    }, delay);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, category, delay]);

  return state;
}
