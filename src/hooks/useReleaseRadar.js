import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { isFeedStale, refreshFeed } from '../lib/news';
import { buildRadar, loadRadar, refreshRadar, saveRadar } from '../lib/radar';

/**
 * Release Radar state for `entries`: `{ releases, news, allNews, lastVisit, updatedAt,
 * loading, failed, refresh }`. Opening it refreshes whatever is stale (while
 * online); `refresh()` refetches everything. Dates and articles land separately,
 * so a slow news site never holds up the schedule. `lastVisit` is the previous
 * time the radar was opened, for "New" markers.
 */
export function useReleaseRadar(entries) {
  const [cache, setCache] = useState(loadRadar);
  const [lastVisit] = useState(() => cache.lastVisit);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(0);
  const online = useOnlineStatus();
  const entriesRef = useRef(entries);
  const cacheRef = useRef(cache);
  const runRef = useRef(null);

  useEffect(() => {
    entriesRef.current = entries;
  });

  useEffect(() => {
    cacheRef.current = cache;
    saveRadar(cache);
  }, [cache]);

  useEffect(() => {
    setCache((c) => ({ ...c, lastVisit: Date.now() }));
  }, []);

  const refresh = useCallback(async (force = true) => {
    runRef.current?.abort();
    const controller = new AbortController();
    runRef.current = controller;
    setLoading(true);
    const feed = force || isFeedStale(cacheRef.current.feed) ? refreshFeed(cacheRef.current.feed, { signal: controller.signal }) : null;
    try {
      const titles = refreshRadar(entriesRef.current, cacheRef.current, { force, signal: controller.signal }).then((result) => {
        setCache((c) => ({ ...result.cache, feed: c.feed, lastVisit: c.lastVisit }));
        return result.failed;
      });
      const articles = feed?.then((result) => {
        setCache((c) => ({ ...c, feed: result.feed }));
        return result.failed ? 1 : 0;
      });
      const [titlesFailed, articlesFailed = 0] = await Promise.all([titles, articles]);
      setFailed(titlesFailed + articlesFailed);
    } catch (err) {
      if (err.name !== 'AbortError') setFailed((n) => n + 1);
    } finally {
      if (runRef.current === controller) {
        runRef.current = null;
        setLoading(false);
      }
    }
  }, []);

  // Only new or stale entries are fetched, so re-running after an edit is cheap.
  const ids = entries.map((e) => e.id).join('|');
  useEffect(() => {
    if (online) refresh(false);
  }, [online, ids, refresh]);

  useEffect(() => () => runRef.current?.abort(), []);

  const view = useMemo(() => buildRadar(entries, cache), [entries, cache]);
  const updatedAt = useMemo(() => Math.max(cache.feed?.fetchedAt || 0, ...Object.values(cache.items).map((i) => i.fetchedAt || 0)), [cache.items, cache.feed]);

  return { ...view, lastVisit, updatedAt, loading, failed, refresh };
}
