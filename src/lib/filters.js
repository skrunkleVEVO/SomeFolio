import { CATEGORIES } from './categories';
import { TABS } from './constants';

export const matchesCategory = (entry, category) => category === 'all' || entry.category === category;

/** Genres from a search source plus a custom entry's own tags; both filter like genres. */
export const topicsOf = (entry) => [...(entry.metadata.genres || []), ...(entry.metadata.customTags || [])];

export function matchesTab(entry, tab) {
  if (tab === 'all') return true;
  if (tab === 'favorites') return entry.favorite;
  return entry.status === tab;
}

/** Match an entry against selected vibe/genre tags (any = OR, all = AND). */
export function matchesTags(entry, tags, matchAll = false) {
  if (!tags.length) return true;
  const own = new Set([...entry.vibes, ...topicsOf(entry)]);
  return matchAll ? tags.every((t) => own.has(t)) : tags.some((t) => own.has(t));
}

const SORTERS = {
  updated: (a, b) => b.updatedAt - a.updatedAt,
  added: (a, b) => b.addedAt - a.addedAt,
  title: (a, b) => a.title.localeCompare(b.title),
  rating: (a, b) => (b.rating || 0) - (a.rating || 0) || b.updatedAt - a.updatedAt,
};

export function filterEntries(entries, { category = 'all', tab, tags, matchAll, sort }) {
  return entries
    .filter((e) => matchesCategory(e, category) && matchesTab(e, tab) && matchesTags(e, tags, matchAll))
    .sort(SORTERS[sort] || SORTERS.updated);
}

export function tabCounts(entries) {
  return Object.fromEntries(TABS.map((t) => [t.id, entries.filter((e) => matchesTab(e, t.id)).length]));
}

export function categoryCounts(entries) {
  const counts = { all: entries.length };
  for (const c of CATEGORIES) counts[c.id] = 0;
  for (const e of entries) counts[e.category] += 1;
  return counts;
}

/** Genres and custom tags present in the given entries, most common first. */
export function genresIn(entries) {
  const counts = new Map();
  for (const e of entries) for (const g of topicsOf(e)) counts.set(g, (counts.get(g) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([g]) => g);
}

export function timeAgo(date) {
  const s = Math.round((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(date).toLocaleDateString();
}
