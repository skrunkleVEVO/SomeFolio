// Live search, one database per category. Every source returns results in the
// same shape, which lib/entries.js `entryFromMedia` turns into a library entry:
//
//   { id, source, category, title, altTitle, cover, banner, color, genres,
//     synopsis, format, year, score (0–100), url, ...category fields }
//
// The category fields use the metadata keys from lib/categories.js (episodes,
// chapters, author, platform, director, …), so they show up in the Details editor.
//
//   anime, manga   AniList → Jikan (MyAnimeList)          lib/anilist.js
//   books          Open Library → Google Books
//   movies/TV      TMDB if VITE_TMDB_KEY is set, else TVmaze (shows) + Wikipedia (films)
//   games          RAWG if VITE_RAWG_KEY is set, else Wikipedia
//
// The keyless sources all allow cross-origin requests, so search works on a
// static host without a backend; the optional keys just give richer results.

import { cleanSynopsis, searchAnime, searchManga } from './anilist';

const TMDB_KEY = import.meta.env.VITE_TMDB_KEY;
const RAWG_KEY = import.meta.env.VITE_RAWG_KEY;

const yearOf = (text) => Number(String(text || '').match(/\b(1[89]|20)\d{2}\b/)?.[0]) || null;
const https = (url) => (url ? url.replace(/^http:\/\//, 'https://') : '');

async function getJson(url, signal) {
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${new URL(url).hostname} responded ${res.status}`);
  return res.json();
}

/** First source that answers wins; an abort stops the chain. */
async function firstOf(sources, query, signal) {
  let lastError;
  for (const source of sources) {
    try {
      return await source(query, signal);
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      lastError = err;
    }
  }
  throw lastError;
}

/** Run sources side by side and interleave their results; fails only if all of them fail. */
async function blend(sources, query, signal, limit = 12) {
  const settled = await Promise.allSettled(sources.map((source) => source(query, signal)));
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const lists = settled.filter((s) => s.status === 'fulfilled').map((s) => s.value);
  if (!lists.length) throw settled[0].reason;
  const out = [];
  for (let i = 0; out.length < limit && lists.some((l) => i < l.length); i++) {
    for (const list of lists) if (list[i] && out.length < limit) out.push(list[i]);
  }
  return out;
}

/* ---------- Wikipedia (keyless fallback for films and games) ---------- */

/** Articles carrying the given infobox, in search-relevance order. */
async function searchWikipedia(query, infobox, signal) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    origin: '*',
    generator: 'search',
    gsrsearch: `${query} hastemplate:"${infobox}"`,
    gsrnamespace: '0',
    gsrlimit: '10',
    prop: 'pageimages|description|extracts',
    piprop: 'thumbnail',
    pithumbsize: '500',
    pilicense: 'any', // box art and posters are non-free images, left out by default
    exintro: '1',
    explaintext: '1',
    exlimit: '10',
  });
  const json = await getJson(`https://en.wikipedia.org/w/api.php?${params}`, signal);
  return (json.query?.pages || []).sort((a, b) => a.index - b.index);
}

function fromWikipedia(page, category) {
  return {
    id: `wiki-${page.pageid}`,
    source: 'wikipedia',
    category,
    title: page.title.replace(/ \((\d{4} )?(video game|film|TV series|miniseries)\)$/i, ''),
    altTitle: '',
    cover: page.thumbnail?.source || '',
    banner: '',
    color: '',
    genres: [],
    synopsis: (page.extract || '').slice(0, 1500),
    year: yearOf(page.description) || yearOf(page.title.match(/\(([^)]*)\)$/)?.[1]), // "2017 video game", "Dune (2021 film)"
    score: null,
    url: `https://en.wikipedia.org/?curid=${page.pageid}`,
  };
}

/* ---------- books ---------- */

async function searchOpenLibrary(query, signal) {
  const params = new URLSearchParams({
    q: query,
    limit: '10',
    fields: 'key,title,subtitle,author_name,first_publish_year,cover_i,subject,ratings_average',
  });
  const json = await getJson(`https://openlibrary.org/search.json?${params}`, signal);
  return (json.docs || []).map((d) => ({
    id: `ol-${d.key.split('/').pop()}`,
    source: 'openlibrary',
    category: 'book',
    title: d.title,
    altTitle: d.subtitle || '',
    cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : '',
    banner: '',
    color: '',
    author: d.author_name?.slice(0, 2).join(', ') || '',
    genres: (d.subject || []).filter((s) => s.length < 24).slice(0, 5),
    synopsis: '',
    year: d.first_publish_year || null,
    score: d.ratings_average ? Math.round(d.ratings_average * 20) : null,
    url: `https://openlibrary.org${d.key}`,
  }));
}

async function searchGoogleBooks(query, signal) {
  const params = new URLSearchParams({ q: query, maxResults: '10', printType: 'books' });
  const json = await getJson(`https://www.googleapis.com/books/v1/volumes?${params}`, signal);
  return (json.items || []).map(({ id, volumeInfo: v }) => ({
    id: `gb-${id}`,
    source: 'googlebooks',
    category: 'book',
    title: v.title,
    altTitle: v.subtitle || '',
    cover: https(v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail),
    banner: '',
    color: '',
    author: v.authors?.slice(0, 2).join(', ') || '',
    genres: v.categories || [],
    synopsis: cleanSynopsis(v.description),
    year: yearOf(v.publishedDate),
    score: v.averageRating ? Math.round(v.averageRating * 20) : null,
    url: https(v.infoLink),
  }));
}

/* ---------- movies & TV ---------- */

const TMDB_IMG = 'https://image.tmdb.org/t/p';

async function searchTmdb(query, signal) {
  const params = new URLSearchParams({ query, api_key: TMDB_KEY, include_adult: 'false' });
  const json = await getJson(`https://api.themoviedb.org/3/search/multi?${params}`, signal);
  return (json.results || [])
    .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
    .slice(0, 12)
    .map((r) => {
      const movie = r.media_type === 'movie';
      const title = movie ? r.title : r.name;
      const original = movie ? r.original_title : r.original_name;
      return {
        id: `tmdb-${r.media_type}-${r.id}`,
        source: 'tmdb',
        category: 'screen',
        title,
        altTitle: original && original !== title ? original : '',
        cover: r.poster_path ? `${TMDB_IMG}/w500${r.poster_path}` : '',
        banner: r.backdrop_path ? `${TMDB_IMG}/w1280${r.backdrop_path}` : '',
        color: '',
        format: movie ? 'Movie' : 'Series',
        genres: [],
        synopsis: r.overview || '',
        year: yearOf(movie ? r.release_date : r.first_air_date),
        score: r.vote_count ? Math.round(r.vote_average * 10) : null,
        url: `https://www.themoviedb.org/${r.media_type}/${r.id}`,
      };
    });
}

async function searchTvmaze(query, signal) {
  const json = await getJson(`https://api.tvmaze.com/search/shows?${new URLSearchParams({ q: query })}`, signal);
  return json.map(({ show: s }) => ({
    id: `tvmaze-${s.id}`,
    source: 'tvmaze',
    category: 'screen',
    title: s.name,
    altTitle: '',
    cover: https(s.image?.original || s.image?.medium),
    banner: '',
    color: '',
    format: s.type === 'Documentary' ? 'Documentary' : 'Series',
    network: s.network?.name || s.webChannel?.name || '',
    genres: s.genres || [],
    synopsis: cleanSynopsis(s.summary),
    year: yearOf(s.premiered),
    score: s.rating?.average ? Math.round(s.rating.average * 10) : null,
    url: s.url,
  }));
}

async function searchWikipediaFilms(query, signal) {
  const pages = await searchWikipedia(query, 'Infobox film', signal);
  return pages.map((p) => ({
    ...fromWikipedia(p, 'screen'),
    format: 'Movie',
    director: p.description?.match(/ by (.+)$/i)?.[1] || '', // "2024 film by Denis Villeneuve"
  }));
}

/* ---------- games ---------- */

async function searchRawg(query, signal) {
  const params = new URLSearchParams({ key: RAWG_KEY, search: query, page_size: '10' });
  const json = await getJson(`https://api.rawg.io/api/games?${params}`, signal);
  return (json.results || []).map((g) => ({
    id: `rawg-${g.id}`,
    source: 'rawg',
    category: 'game',
    title: g.name,
    altTitle: '',
    cover: g.background_image || '',
    banner: g.background_image || '',
    color: '',
    platform: g.platforms?.map((p) => p.platform.name).slice(0, 3).join(', ') || '',
    genres: g.genres?.map((x) => x.name) || [],
    synopsis: '',
    year: yearOf(g.released),
    score: g.metacritic || (g.rating ? Math.round(g.rating * 20) : null),
    url: `https://rawg.io/games/${g.slug}`,
  }));
}

async function searchWikipediaGames(query, signal) {
  const pages = await searchWikipedia(query, 'Infobox video game', signal);
  return pages.map((p) => fromWikipedia(p, 'game'));
}

/* ---------- registry ---------- */

const searchShowsAndFilms = (q, signal) => blend([searchTvmaze, searchWikipediaFilms], q, signal);

const SEARCHERS = {
  anime: (q, signal) => searchAnime(q, { signal }),
  manga: (q, signal) => searchManga(q, { signal }),
  book: (q, signal) => firstOf([searchOpenLibrary, searchGoogleBooks], q, signal),
  screen: (q, signal) => firstOf(TMDB_KEY ? [searchTmdb, searchShowsAndFilms] : [searchShowsAndFilms], q, signal),
  game: (q, signal) => firstOf(RAWG_KEY ? [searchRawg, searchWikipediaGames] : [searchWikipediaGames], q, signal),
};

/** Shown as "View on …" in the details drawer. */
export const SOURCE_NAMES = {
  anilist: 'AniList',
  jikan: 'MyAnimeList',
  openlibrary: 'Open Library',
  googlebooks: 'Google Books',
  tmdb: 'TMDB',
  tvmaze: 'TVmaze',
  wikipedia: 'Wikipedia',
  rawg: 'RAWG',
};

/** Whether a category has a database to search (Custom doesn't). */
export const isSearchable = (category) => category in SEARCHERS;

const FOCUS_EVENT = 'somefolio:focus-search';

/** Focus the header search box from anywhere (the tour, empty states), optionally switching its category. */
export function focusSearch(category) {
  window.dispatchEvent(new CustomEvent(FOCUS_EVENT, { detail: { category } }));
}

export function onFocusSearch(listener) {
  const handler = (e) => listener(e.detail?.category);
  window.addEventListener(FOCUS_EVENT, handler);
  return () => window.removeEventListener(FOCUS_EVENT, handler);
}

const cache = new Map();

export async function searchMedia(category, query, { signal } = {}) {
  const key = `${category}:${query.trim().toLowerCase()}`;
  if (cache.has(key)) return cache.get(key);
  const results = await SEARCHERS[category](query, signal);
  cache.set(key, results);
  return results;
}

/** Compact facts for a result row: "2020 · TV · 24 eps · MAPPA". */
export function resultFacts(media) {
  const count = media.episodes ? `${media.episodes} eps` : media.chapters ? `${media.chapters} ch` : null;
  const maker = media.studio || media.author || media.director || media.network || media.developer || media.platform;
  return [media.year, media.format, count, maker].filter(Boolean).join(' · ');
}
