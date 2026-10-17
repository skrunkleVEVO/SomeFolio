/** Build a library entry from a normalised search result. */
export function createEntry(media, status = 'plan') {
  const now = Date.now();
  return {
    id: media.id,
    source: media.source,
    title: media.title,
    altTitle: media.altTitle || '',
    cover: media.cover,
    banner: media.banner || '',
    color: media.color || '',
    studio: media.studio || '',
    episodes: media.episodes || null,
    genres: media.genres || [],
    synopsis: media.synopsis || '',
    format: media.format || '',
    year: media.year || null,
    score: media.score || null,
    url: media.url || '',
    status,
    favorite: false,
    progress: status === 'completed' && media.episodes ? media.episodes : 0,
    rating: 0,
    notes: '',
    vibes: [],
    franchise: null, // null = auto-detect, '' = never group, else a franchise name (see lib/franchises.js)
    addedAt: now,
    updatedAt: now,
  };
}

/**
 * Patch for changing episode progress. Starting a show moves it to Watching;
 * reaching the final episode marks it Completed.
 */
export function progressPatch(entry, delta) {
  const max = entry.episodes || Infinity;
  const progress = Math.max(0, Math.min(max, (entry.progress || 0) + delta));
  const patch = { progress };
  let completed = false;
  if (delta > 0 && (entry.status === 'plan' || entry.status === 'hold')) patch.status = 'watching';
  if (delta > 0 && entry.episodes && progress >= entry.episodes && entry.status !== 'completed') {
    patch.status = 'completed';
    completed = true;
  }
  return { patch, completed, changed: progress !== (entry.progress || 0) };
}
