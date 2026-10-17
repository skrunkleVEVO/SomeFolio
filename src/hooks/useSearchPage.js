import { useCallback, useEffect, useState } from 'react';
import { isSearchable } from '../lib/search';

// The full results page lives in the URL hash (#search?q=dune&in=all), so the
// browser's Back button returns to the library and a refresh keeps the page.
// `in` is a searchable category, or `all` for every database at once.

const PUSHED = 'somefolio:search'; // history.state marker: this entry was pushed over the library

function parse() {
  const match = window.location.hash.match(/^#search\?(.*)$/);
  if (!match) return null;
  const params = new URLSearchParams(match[1]);
  const query = params.get('q')?.trim();
  if (!query) return null;
  const scope = params.get('in');
  return { query, scope: isSearchable(scope) ? scope : 'all' };
}

const hashFor = ({ query, scope }) => `#search?${new URLSearchParams({ q: query, in: scope })}`;

/** `{ search, openSearch, closeSearch }`; `search` is `{ query, scope }` while the results page is open, else null. */
export function useSearchPage() {
  const [search, setSearch] = useState(parse);

  useEffect(() => {
    const onPop = () => setSearch(parse());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const openSearch = useCallback((next) => {
    // A new query or tab replaces the current results, so Back always leads to the library.
    if (parse()) window.history.replaceState(window.history.state, '', hashFor(next));
    else window.history.pushState(PUSHED, '', hashFor(next));
    setSearch(next);
  }, []);

  const closeSearch = useCallback(() => {
    if (parse() && window.history.state === PUSHED) {
      window.history.back(); // popstate clears `search`
      return;
    }
    if (parse()) window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setSearch(null);
  }, []);

  return { search, openSearch, closeSearch };
}
