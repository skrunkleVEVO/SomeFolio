// Ids predate categories (hence `watching` for "In Progress") and are kept so
// existing libraries and other synced devices stay compatible. Category-aware
// labels ("Reading", "Plan to Play") come from statusLabel() in lib/categories.js.
export const STATUSES = [
  { id: 'watching', label: 'In Progress', dot: 'bg-emerald-400' },
  { id: 'completed', label: 'Completed', dot: 'bg-sky-400' },
  { id: 'backlog', label: 'Backlog', dot: 'bg-zinc-400' },
  { id: 'plan', label: 'Planned', dot: 'bg-accent2-400' },
  { id: 'hold', label: 'On Hold', dot: 'bg-amber-400' },
];

export const STATUS_BY_ID = Object.fromEntries(STATUSES.map((s) => [s.id, s]));

export const TABS = [{ id: 'all', label: 'All' }, ...STATUSES, { id: 'favorites', label: 'Favorites' }];

export const DEFAULT_VIBES = [
  'Urban Aesthetic',
  'Cyberpunk',
  'Dark Fantasy',
  'Hype Action',
  'Cozy',
  'Mind-Bender',
  'Tearjerker',
];

/* ---------- appearance (palettes live in index.css) ---------- */

export const ACCENTS = [
  { id: 'neon', label: 'Neon', from: '#d946ef', to: '#7c3aed' },
  { id: 'sakura', label: 'Sakura', from: '#ec4899', to: '#9333ea' },
  { id: 'ocean', label: 'Ocean', from: '#06b6d4', to: '#2563eb' },
  { id: 'matcha', label: 'Matcha', from: '#10b981', to: '#0d9488' },
  { id: 'sunset', label: 'Sunset', from: '#f97316', to: '#e11d48' },
  { id: 'gold', label: 'Gold', from: '#f59e0b', to: '#ea580c' },
  { id: 'crimson', label: 'Crimson', from: '#ef4444', to: '#be123c' },
  { id: 'mono', label: 'Mono', from: '#a1a1aa', to: '#3f3f46' },
];

export const SURFACES = [
  { id: 'midnight', label: 'Midnight', bg: '#09090b', card: '#18181b' },
  { id: 'amoled', label: 'AMOLED', bg: '#000000', card: '#0e0e10' },
  { id: 'navy', label: 'Navy', bg: '#060b18', card: '#0f172a' },
  { id: 'plum', label: 'Plum', bg: '#0d0710', card: '#1a1020' },
];

export const DENSITIES = [
  { id: 'compact', label: 'Compact' },
  { id: 'comfortable', label: 'Comfortable' },
  { id: 'large', label: 'Large' },
];

export const DEFAULT_PREFS = { accent: 'neon', surface: 'midnight', density: 'comfortable', stackFranchises: true };

// Shown in the search dropdown before the library has any tags to suggest.
export const STARTER_SEARCHES = ["JoJo's Bizarre Adventure", 'Fate', 'Frieren', 'Attack on Titan', 'Spy x Family', 'Cowboy Bebop'];

export const THEME_CACHE_KEY = 'somefolio:theme'; // read by the pre-paint script in index.html

export const SORTS = [
  { id: 'updated', label: 'Recently updated' },
  { id: 'added', label: 'Recently added' },
  { id: 'title', label: 'Title A–Z' },
  { id: 'rating', label: 'My rating' },
];
