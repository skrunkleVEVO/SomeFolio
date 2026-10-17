// Category registry: everything that differs between media types lives here,
// so components stay generic and adding a category is a one-object change.
//
//   noun      singular name used in copy ("Name of the game")
//   verb      drives status labels ("Reading", "Plan to Play")
//   progress  the counter a card's +1 button bumps, stored in `metadata`:
//             { key, total?, unit, short } — `total` names the metadata field
//             holding the length; reaching it marks the entry Completed
//   fields    category-specific inputs shown in the Add modal and Details drawer
//   badge     which adaptive badge MediaCard shows (see components/EntryBadge.jsx)
//   search    copy for the search box: { plural, starters } — the database
//             itself is picked in lib/search.js; categories without one omit it
//
// Field types: text | number | select | tags. `list` gives suggestions (datalist);
// `unit` formats a number in summaries ("12 episodes").

import { BookOpen, Clapperboard, Gamepad2, Library, Shapes, Tv } from 'lucide-react';

const year = { key: 'year', label: 'Year', type: 'number', min: 1800, max: 2200, placeholder: '2024' };

export const CATEGORIES = [
  {
    id: 'anime',
    noun: 'anime',
    label: 'Anime',
    icon: Tv,
    verb: 'Watch',
    progress: { key: 'progress', total: 'episodes', unit: 'episode', short: 'Ep' },
    badge: 'episodes',
    search: { plural: 'anime', starters: ["JoJo's Bizarre Adventure", 'Fate', 'Frieren', 'Attack on Titan', 'Spy x Family', 'Cowboy Bebop'] },
    fields: [
      { key: 'episodes', label: 'Episodes', type: 'number', unit: 'episode', min: 0, placeholder: '12' },
      { key: 'studio', label: 'Studio', type: 'text', placeholder: 'MAPPA' },
      { key: 'format', label: 'Format', type: 'select', options: ['TV', 'Movie', 'OVA', 'ONA', 'Special', 'TV Short'] },
      year,
    ],
  },
  {
    id: 'manga',
    noun: 'manga',
    label: 'Manga',
    icon: BookOpen,
    verb: 'Read',
    progress: { key: 'progress', total: 'chapters', unit: 'chapter', short: 'Ch' },
    badge: 'bar',
    search: { plural: 'manga', starters: ['One Piece', 'Berserk', 'Chainsaw Man', 'Vagabond', 'Blue Lock', 'Dungeon Meshi'] },
    fields: [
      { key: 'chapters', label: 'Chapters', type: 'number', unit: 'chapter', min: 0, placeholder: '120' },
      { key: 'volumes', label: 'Volumes', type: 'number', unit: 'volume', min: 0, placeholder: '14' },
      { key: 'author', label: 'Author', type: 'text', placeholder: 'Hirohiko Araki' },
      year,
    ],
  },
  {
    id: 'game',
    noun: 'game',
    label: 'Games',
    icon: Gamepad2,
    verb: 'Play',
    progress: { key: 'hoursPlayed', unit: 'hour', short: 'h' },
    badge: 'platform',
    search: { plural: 'games', starters: ['Elden Ring', 'Hollow Knight', 'Persona 5', 'The Witcher 3', 'Hades', 'Stardew Valley'] },
    fields: [
      {
        key: 'platform',
        label: 'Platform',
        type: 'text',
        placeholder: 'PC',
        list: ['PC', 'PlayStation 5', 'PlayStation 4', 'Xbox Series X|S', 'Nintendo Switch', 'Steam Deck', 'iOS', 'Android'],
      },
      { key: 'hoursPlayed', label: 'Hours played', type: 'number', min: 0, placeholder: '0' },
      { key: 'developer', label: 'Developer', type: 'text', placeholder: 'FromSoftware' },
      year,
    ],
  },
  {
    id: 'screen',
    noun: 'movie or show',
    label: 'Movies/TV',
    icon: Clapperboard,
    verb: 'Watch',
    progress: { key: 'progress', total: 'episodes', unit: 'episode', short: 'Ep' },
    badge: 'episodes',
    search: { plural: 'movies & shows', starters: ['Dune', 'Breaking Bad', 'Severance', 'Arcane', 'Interstellar', 'The Bear'] },
    fields: [
      { key: 'format', label: 'Format', type: 'select', options: ['Movie', 'Series', 'Miniseries', 'Documentary'] },
      { key: 'episodes', label: 'Episodes', type: 'number', unit: 'episode', min: 0, placeholder: '10' },
      { key: 'director', label: 'Director / creator', type: 'text', placeholder: 'Denis Villeneuve' },
      year,
    ],
  },
  {
    id: 'book',
    noun: 'book',
    label: 'Books',
    icon: Library,
    verb: 'Read',
    progress: { key: 'progress', total: 'chapters', unit: 'chapter', short: 'Ch' },
    badge: 'bar',
    search: { plural: 'books', starters: ['Dune', 'The Hobbit', 'Project Hail Mary', 'Piranesi', 'The Name of the Wind', '1984'] },
    fields: [
      { key: 'author', label: 'Author', type: 'text', placeholder: 'Ursula K. Le Guin' },
      { key: 'chapters', label: 'Chapters', type: 'number', unit: 'chapter', min: 0, placeholder: '24' },
      year,
    ],
  },
  {
    id: 'custom',
    noun: 'thing',
    label: 'Custom',
    icon: Shapes,
    verb: null,
    progress: null,
    badge: 'tags',
    fields: [
      { key: 'customTags', label: 'Tags', type: 'tags', placeholder: 'Board game, Vinyl, Podcast…' },
      { key: 'link', label: 'Link', type: 'text', placeholder: 'https://…' },
    ],
  },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export const DEFAULT_CATEGORY = 'anime'; // entries saved before categories existed were all anime

export const getCategory = (id) => CATEGORY_BY_ID[id] || CATEGORY_BY_ID.custom;

const ING = { Watch: 'Watching', Read: 'Reading', Play: 'Playing' };

/**
 * Status label for a category ("Reading", "Plan to Play"). Without a category
 * (the All view) the generic label from STATUSES is used.
 */
export function statusLabel(status, categoryId) {
  const verb = CATEGORY_BY_ID[categoryId]?.verb;
  if (status?.id === 'watching' && verb) return ING[verb];
  if (status?.id === 'plan' && verb) return `Plan to ${verb}`;
  return status?.label ?? '';
}

/** `{ value, total, pct }` for the entry's progress counter, or null for categories without one. */
export function progressOf(entry) {
  const spec = getCategory(entry.category).progress;
  if (!spec) return null;
  const value = Number(entry.metadata?.[spec.key]) || 0;
  const total = spec.total ? Number(entry.metadata?.[spec.total]) || null : null;
  return { spec, value, total, pct: total ? Math.min(100, (value / total) * 100) : 0 };
}

/** "Ep 3/12", "Ch 40", "12h" — the compact progress text used on cards and rows. */
export function progressText({ spec, value, total }) {
  if (spec.short === 'h') return value ? `${value}h` : '';
  if (total) return `${spec.short} ${value}/${total}`;
  return value ? `${spec.short} ${value}` : '';
}

/** "1 episode", "3 chapters". */
export function unitCount(n, unit) {
  return `${n} ${unit}${n === 1 ? '' : 's'}`;
}

/** Short facts for the drawer header and list rows, e.g. ["12 episodes", "MAPPA", "TV", "2020"]. */
export function detailLine(entry) {
  const category = getCategory(entry.category);
  return category.fields
    .filter((f) => f.type !== 'tags' && f.key !== 'link' && f.key !== category.progress?.key)
    .map((f) => {
      const value = entry.metadata[f.key];
      if (value == null || value === '') return null;
      return f.unit ? unitCount(Number(value), f.unit) : String(value);
    })
    .filter(Boolean);
}
