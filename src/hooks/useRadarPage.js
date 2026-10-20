import { useCallback, useEffect, useState } from 'react';

// The Release Radar lives at #radar, like the search page (hooks/useSearchPage.js),
// so Back returns to wherever it was opened from.

const PUSHED = 'somefolio:radar'; // history.state marker: this entry was pushed over another page
const isOpen = () => window.location.hash === '#radar';

/** `{ radarOpen, openRadar, closeRadar }`. */
export function useRadarPage() {
  const [radarOpen, setRadarOpen] = useState(isOpen);

  useEffect(() => {
    const onPop = () => setRadarOpen(isOpen());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const openRadar = useCallback(() => {
    if (!isOpen()) {
      window.history.pushState(PUSHED, '', '#radar');
      // pushState fires no event: let the search page see that the URL changed.
      window.dispatchEvent(new PopStateEvent('popstate', { state: PUSHED }));
    }
    setRadarOpen(true);
  }, []);

  const closeRadar = useCallback(() => {
    if (isOpen() && window.history.state === PUSHED) {
      window.history.back(); // popstate clears `radarOpen`
      return;
    }
    if (isOpen()) window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setRadarOpen(false);
  }, []);

  return { radarOpen, openRadar, closeRadar };
}
