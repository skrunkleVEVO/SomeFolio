import { useEffect, useState } from 'react';
import { searchAnime } from '../lib/anilist';

const IDLE = { results: [], loading: false, error: null };

/** Debounced live search; cancels in-flight requests as the user keeps typing. */
export function useAnimeSearch(query, delay = 350) {
  const [state, setState] = useState(IDLE);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setState(IDLE);
      return;
    }
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    const timer = setTimeout(async () => {
      try {
        const results = await searchAnime(q, { signal: controller.signal });
        setState({ results, loading: false, error: null });
      } catch (err) {
        if (err.name !== 'AbortError') {
          setState({ results: [], loading: false, error: 'Search is unavailable right now. Try again in a moment.' });
        }
      }
    }, delay);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, delay]);

  return state;
}
