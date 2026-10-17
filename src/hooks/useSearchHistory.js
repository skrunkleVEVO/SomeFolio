import { useSyncExternalStore } from 'react';
import { addSearch, clearHistory, getHistory, removeSearch, subscribe } from '../lib/searchHistory';

/** Recent search queries as React state, shared by every component and tab. */
export function useSearchHistory() {
  const history = useSyncExternalStore(subscribe, getHistory, getHistory);
  return { history, addSearch, removeSearch, clearHistory };
}
