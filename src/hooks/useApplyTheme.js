import { useEffect } from 'react';
import { SURFACES, THEME_CACHE_KEY } from '../lib/constants';

/** Mirror theme prefs onto <html data-accent data-surface> and the browser chrome colour. */
export function useApplyTheme({ accent, surface }) {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.accent = accent;
    root.dataset.surface = surface;
    const bg = SURFACES.find((s) => s.id === surface)?.bg ?? SURFACES[0].bg;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
    try {
      localStorage.setItem(THEME_CACHE_KEY, JSON.stringify({ accent, surface, bg }));
    } catch {
      /* the theme still applies, it just may flash on next load */
    }
  }, [accent, surface]);
}
