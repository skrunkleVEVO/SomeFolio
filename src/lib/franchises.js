// Franchise stacking: groups split entries of one series ("JoJo's Bizarre
// Adventure", "…: Stardust Crusaders", "…: Golden Wind") under a single hub.
//
// Each entry's optional `franchise` field decides how it groups:
//   undefined / null  auto-detect from its titles (the default)
//   'Some name'       manual: grouped with every entry using that name
//   ''                never grouped
// It syncs like any other entry field, so no extra Firestore docs are needed.

const SUFFIXES = [
  /\s*\(\d{4}\)$/, // "Hunter x Hunter (2011)"
  /\s+(?:season|part|cour)\s*\d+\b.*$/i, // "Attack on Titan Season 3 Part 2"
  /\s+\d+(?:st|nd|rd|th)\s+(?:season|part|cour)\b.*$/i, // "Kaguya-sama 2nd Season"
  /\s+(?:the\s+)?(?:final|second|third|fourth|fifth|last)\s+(?:season|part|cour)\b.*$/i,
  /\s+(?:II|III|IV|V|VI|VII|VIII|IX|X)$/, // "Mob Psycho 100 III" (case-sensitive on purpose)
  /\s+\d{1,2}$/, // "Steins;Gate 0" (but not "Mob Psycho 100")
];

/** The series name a title most likely belongs to, e.g. "Fate/Zero" → "Fate". */
export function baseTitle(title = '') {
  const full = title.trim();
  const slash = full.match(/^([^\s/]{3,})\/\S/); // "Fate/stay night", but not "Ranma 1/2"
  if (slash) return slash[1];
  // Drop a subtitle after ": " or " - " ("Re:Zero" has no space, so it stays whole).
  let base = full.split(/\s*:\s+|\s+[-–—]\s+/)[0];
  for (const re of SUFFIXES) base = base.replace(re, '');
  return base.trim() || full;
}

/** Comparable form of a name: accents, case, punctuation and spaces removed. */
export function normalizeName(name = '') {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function autoKeys(entry) {
  const keys = [entry.title, entry.altTitle].filter(Boolean).map((t) => normalizeName(baseTitle(t)));
  return [...new Set(keys.filter((k) => k.length >= 3))];
}

const byRelease = (a, b) => (a.year ?? Infinity) - (b.year ?? Infinity) || a.addedAt - b.addedAt;

/**
 * Group live entries into franchises. Returns
 * `{ groups: Map<groupId, Group>, groupOf: Map<entryId, groupId> }` where
 * `Group = { id, name, manual, entries }`, entries in release order.
 * Only groups with two or more entries are returned.
 */
export function buildFranchises(entries) {
  // Union-find over entries that share a key. A manual name is a key too, so
  // new auto-detected seasons join an existing hand-named franchise.
  const parent = new Map();
  const manualName = new Map(); // root id → manual name, if the set has one
  const find = (id) => {
    while (parent.get(id) !== id) {
      parent.set(id, parent.get(parent.get(id)));
      id = parent.get(id);
    }
    return id;
  };
  const union = (a, b) => {
    const [ra, rb] = [find(a), find(b)];
    if (ra === rb) return;
    const [na, nb] = [manualName.get(ra), manualName.get(rb)];
    if (na && nb && normalizeName(na) !== normalizeName(nb)) return; // never merge two named franchises
    parent.set(rb, ra);
    if (!na && nb) manualName.set(ra, nb);
  };

  const owner = new Map(); // key → first entry id seen with it
  for (const entry of entries) {
    if (entry.franchise === '') continue;
    parent.set(entry.id, entry.id);
    const manual = typeof entry.franchise === 'string' && entry.franchise.trim();
    if (manual) manualName.set(entry.id, manual);
    for (const key of manual ? [normalizeName(manual)] : autoKeys(entry)) {
      if (owner.has(key)) union(owner.get(key), entry.id);
      else owner.set(key, entry.id);
    }
  }

  const sets = new Map();
  for (const entry of entries) {
    if (!parent.has(entry.id)) continue;
    const root = find(entry.id);
    if (!sets.has(root)) sets.set(root, []);
    sets.get(root).push(entry);
  }

  const groups = new Map();
  const groupOf = new Map();
  for (const [root, members] of sets) {
    if (members.length < 2) continue;
    members.sort(byRelease);
    const manual = manualName.get(root);
    const name = manual || baseTitle(members[0].title);
    const id = `franchise:${normalizeName(name) || root}`;
    groups.set(id, { id, name, manual: Boolean(manual), entries: members });
    for (const e of members) groupOf.set(e.id, id);
  }
  return { groups, groupOf };
}

/**
 * Collapse an already filtered and sorted entry list into grid items. A group
 * takes the position of its first visible member; a group with only one visible
 * member stays a plain card.
 */
export function stackEntries(visible, { groups, groupOf }) {
  const visibleCount = new Map();
  for (const e of visible) {
    const id = groupOf.get(e.id);
    if (id) visibleCount.set(id, (visibleCount.get(id) || 0) + 1);
  }
  const placed = new Set();
  const items = [];
  for (const entry of visible) {
    const id = groupOf.get(entry.id);
    if (!id || visibleCount.get(id) < 2) items.push({ kind: 'entry', key: entry.id, entry });
    else if (!placed.has(id)) {
      placed.add(id);
      items.push({ kind: 'franchise', key: id, group: groups.get(id) });
    }
  }
  return items;
}

/** "JoJo's Bizarre Adventure: Golden Wind" in "JoJo's Bizarre Adventure" → "Golden Wind". */
export function partLabel(entry, groupName) {
  const title = entry.title || '';
  const tail = title.slice(groupName.length);
  // Only strip a whole-word prefix: "JoJo" must not turn "JoJo's …" into "'s …".
  if (title.toLowerCase().startsWith(groupName.toLowerCase()) && !/^[\p{L}\p{N}'’]/u.test(tail)) {
    const rest = tail.replace(/^[\s:/\-–—]+/, '').trim();
    if (rest) return rest;
  }
  return title;
}

/** Totals shown on hub cards and in the hub sheet. */
export function franchiseStats(group) {
  const { entries } = group;
  const completed = entries.filter((e) => e.status === 'completed').length;
  const watching = [...entries].filter((e) => e.status === 'watching').sort((a, b) => b.updatedAt - a.updatedAt);
  const rated = entries.filter((e) => e.rating > 0);
  const episodesKnown = entries.every((e) => e.episodes);
  return {
    total: entries.length,
    completed,
    watching,
    favorite: entries.some((e) => e.favorite),
    watchedEpisodes: entries.reduce((sum, e) => sum + (e.progress || 0), 0),
    totalEpisodes: episodesKnown ? entries.reduce((sum, e) => sum + e.episodes, 0) : null,
    avgRating: rated.length ? Math.round((rated.reduce((s, e) => s + e.rating, 0) / rated.length) * 10) / 10 : 0,
  };
}
