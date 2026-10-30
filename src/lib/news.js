// Entertainment news for the Release Radar's feed, read straight from the public
// WordPress APIs of sites that allow it, with no key and no proxy. The latest
// posts of each site are fetched whole and matched to the library on the device,
// so a library's titles are never sent anywhere.
//
//   Feed item  { id, kind, at, headline, summary, url, linkLabel, thumb, source, media, badge }
//
// Headlines decide everything: a post is kept only if its headline says what kind
// of news it is, and belongs to a title only if its headline names that title.

import { cleanSynopsis } from './anilist';

const DAY = 24 * 60 * 60 * 1000;
const MAX_AGE = 45 * DAY;
const MAX_ITEMS = 300; // items are cached in LocalStorage
const TIMEOUT_MS = 10000;
const STALE_MS = 3 * 60 * 60 * 1000;
const FIELDS = 'date_gmt,link,title,excerpt,jetpack_featured_media_url';

const SOURCES = [
  { name: 'Gematsu', host: 'www.gematsu.com', media: ['game'] },
  { name: 'Insider Gaming', host: 'insider-gaming.com', media: ['game'] },
  { name: 'Siliconera', host: 'www.siliconera.com', media: ['game', 'anime', 'manga'] },
  { name: 'Anime Hunch', host: 'animehunch.com', media: ['anime', 'manga'] },
  { name: 'ComicBook', host: 'comicbook.com', media: ['screen', 'game', 'anime', 'manga', 'book'] },
  { name: 'Literary Hub', host: 'lithub.com', media: ['book'] },
];

/* ---------- classifying ---------- */

const NOISE = /\b(reviews?|codes?|deals?|guides?|how to|how long|faq|walkthrough|wordle|save \d+|best|ranked|ranking|quiz|every|discount|on sale|interview|opinion)\b/i;

// First match wins, so a leaked release date reads as a leak.
const KINDS = [
  ['leak', /\b(leak(s|ed)?|rumou?r(s|ed)?|data-?min(e|ed|ing)|allegedly|reportedly (set|in|working|being|coming|getting|planning|developing|has|had))\b/i],
  ['beta', /\b(betas?|playtests?|early access|demo|network test|technical test)\b/i],
  ['season', /\b(season\s+\d+|(second|third|fourth|fifth|sixth|final|new|next)\s+season|\d(st|nd|rd|th)\s+season|renewed|cancell?ed)\b/i],
  ['trailer', /\b(trailers?|teasers?|first look|gameplay video)\b/i],
  ['release', /\b(release date|release window|launch(es|ing)?|out now|now available|premieres?|releases? (on|in)|coming (to|in|on)|arrives?|delayed|publication)\b/i],
  ['update', /\b(patch|update|version \d|dlc|expansion|free content|new chapter)\b/i],
  ['announcement', /\b(announc\w+|revealed?|unveil\w*|confirm\w*|green-?lit|adaptation|in the works|new (anime|manga|game|novel|series|film|movie))\b/i],
];

function classify(headline) {
  if (NOISE.test(headline)) return null;
  return KINDS.find(([, pattern]) => pattern.test(headline))?.[0] || null;
}

function badgeFor(source, headline) {
  if (source.media[0] === 'book') return 'BOOK';
  if (/\banime\b/i.test(headline)) return 'ANIME';
  if (/\bmanga\b/i.test(headline)) return 'MANGA';
  if (source.media[0] === 'game') return 'GAME';
  if (source.media[0] === 'anime') return 'ANIME';
  if (/\b(movie|film)\b/i.test(headline)) return 'FILM';
  if (/\b(season|series|episode|show)\b/i.test(headline)) return 'TV';
  if (/\b(game|games|xbox|playstation|ps5|nintendo|switch|steam)\b/i.test(headline)) return 'GAME';
  return 'OTHER'; // a site covering everything, and a headline that doesn't say
}

function excerptOf(html) {
  const clean = cleanSynopsis(html).replace(/\s+/g, ' ').replace(/\s*(\[…\]|\[\.\.\.\]|…|Read more.*)$/i, '').trim();
  if (clean.length <= 200) return clean;
  return `${clean.slice(0, clean.lastIndexOf(' ', 200))}…`;
}

function fromPost(post, source, now) {
  const headline = cleanSynopsis(post.title?.rendered || '').trim();
  const kind = headline && classify(headline);
  const at = Date.parse(`${post.date_gmt}Z`);
  if (!kind || !post.link || !at || now - at > MAX_AGE) return null;
  return {
    id: `news-${post.link}`,
    kind,
    at,
    headline,
    summary: excerptOf(post.excerpt?.rendered || ''),
    url: post.link,
    linkLabel: `Read on ${source.name}`,
    thumb: post.jetpack_featured_media_url || '',
    source: source.name,
    media: source.media,
    badge: badgeFor(source, headline),
  };
}

/* ---------- fetching ---------- */

async function fetchSource(source, signal, now) {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), TIMEOUT_MS);
  const stop = () => timeout.abort();
  signal?.addEventListener('abort', stop);
  try {
    const params = new URLSearchParams({ per_page: 50, _fields: FIELDS });
    const res = await fetch(`https://${source.host}/wp-json/wp/v2/posts?${params}`, { signal: timeout.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`${source.host} responded ${res.status}`);
    const posts = await res.json();
    return posts.map((post) => fromPost(post, source, now)).filter(Boolean);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', stop);
  }
}

export const isFeedStale = (feed) => Date.now() - (feed?.fetchedAt || 0) >= STALE_MS;

/**
 * The feed cache after one fetch of every source, newest first. A source that
 * fails keeps its earlier items; older posts stay until they age out, since each
 * site's API only reaches back a few days. `failed` is true when no source answered.
 */
export async function refreshFeed(previous, { signal } = {}) {
  const now = Date.now();
  const results = await Promise.allSettled(SOURCES.map((source) => fetchSource(source, signal, now)));
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  const byId = new Map((previous?.items || []).filter((item) => now - item.at <= MAX_AGE).map((item) => [item.id, item]));
  for (const result of results) if (result.status === 'fulfilled') for (const item of result.value) byId.set(item.id, item);

  // The same story from two sites keeps its earliest copy.
  const byHeadline = new Map();
  for (const item of [...byId.values()].sort((a, b) => a.at - b.at)) {
    const key = normalize(item.headline);
    if (!byHeadline.has(key)) byHeadline.set(key, item);
  }
  const items = [...byHeadline.values()].sort((a, b) => b.at - a.at).slice(0, MAX_ITEMS);
  const failed = results.every((r) => r.status === 'rejected');
  return { feed: { items, fetchedAt: failed ? previous?.fetchedAt || 0 : now }, failed };
}

/* ---------- matching ---------- */

/** " elden ring nightreign " — padded, so a title only matches on whole words. */
function normalize(text) {
  const plain = String(text || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  return ` ${plain} `;
}

const SEASON_SUFFIX = /[\s:-]+((season|part|cour)\s+\d+|\d+(st|nd|rd|th)\s+season|final season)\b.*$/i;

/** What a headline might call this title: its names, without "Season 2" or a subtitle after a colon. */
function titleKeys(entry) {
  const names = [entry.title, entry.metadata?.altTitle].filter(Boolean);
  const keys = new Set();
  for (const name of names) {
    const base = name.replace(SEASON_SUFFIX, '');
    for (const form of [name, base, base.split(':')[0]]) {
      const key = normalize(form);
      if (key.trim().length >= 4) keys.add(key);
    }
  }
  return [...keys];
}

const isSingleWord = (key) => !key.trim().includes(' ');

/**
 * `(item) => entry | null`: the library title a feed item is about, if any. The
 * longest matching name wins, so a story about a sequel finds the sequel. One-word
 * titles ("Control", "Journey") must open the headline, since they are also words.
 */
export function feedMatcher(entries) {
  const index = entries.flatMap((entry) =>
    titleKeys(entry).map((key) => ({ entry, key, single: isSingleWord(key), custom: entry.category === 'custom' })),
  );
  index.sort((a, b) => b.key.length - a.key.length);

  return (item) => {
    const text = normalize(item.headline);
    for (const { entry, key, single, custom } of index) {
      if (custom ? single : !item.media.includes(entry.category)) continue;
      if (single ? text.startsWith(key) : text.includes(key)) return entry;
    }
    return null;
  };
}
