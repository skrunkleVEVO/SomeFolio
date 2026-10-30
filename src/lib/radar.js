// Release Radar: upcoming releases and news for titles in the library, built
// from the same keyless sources search uses (see lib/search.js), matched by
// entry id:
//
//   al-…, mal-…       AniList airing schedule, recently aired episodes, trailers,
//                     and related titles (sequels, spin-offs, anime adaptations)
//   tvmaze-…          TVmaze next and previous episode
//   tmdb-…            TMDB episode / release dates and trailers (needs VITE_TMDB_KEY)
//   rawg-…            RAWG release date (needs VITE_RAWG_KEY)
//   wiki-…            Wikidata release dates, for games, films and books found on Wikipedia
//   gb-…              Google Books publication date
//   any entry         the "Next release" date and note in its details (metadata.releaseDate / releaseNote)
//   any entry         articles from entertainment sites whose headline names it (lib/news.js)
//
// Fetched items are cached per entry in LocalStorage, so the radar opens
// offline and a refresh only fetches entries that are stale or new. The cache
// is derived data and never synced; the manual dates it reads already sync as
// part of each entry's metadata.
//
//   Release  { id, entryId, refId?, kind, at, allDay, label, title?, cover?, url?, ...details }
//   News     { id, entryId, refId?, kind, at?, headline, body?, url?, image?, cover?, ...details }
//   details  { summary?, still?, facts?: string[], linkLabel? }   what expanding the item shows
//
// `title` / `cover` override the entry's own when an item is about a related
// title; `refId` is that title's library id, and the item is hidden once the
// title is tracked itself (it then gets items of its own). News without a known
// date (`at`) is dated by when the radar first spotted it.

import { ANILIST_URL, cleanSynopsis } from './anilist';
import { feedMatcher } from './news';

const TMDB_KEY = import.meta.env.VITE_TMDB_KEY;
const RAWG_KEY = import.meta.env.VITE_RAWG_KEY;

const CACHE_KEY = 'somefolio:radar:v1';
const ITEM_SCHEMA = 3; // bump when fetched items gain fields, so older cached ones refetch
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const STALE_MS = 3 * HOUR;
const RECENT_MS = 14 * DAY; // how far back "is out" news reaches
const NEWS_MAX_AGE = 45 * DAY;

/* ---------- badges ---------- */

export const BADGES = {
  ANIME: { label: 'Anime', tone: 'text-sky-300' },
  MANGA: { label: 'Manga', tone: 'text-rose-300' },
  GAME: { label: 'Game', tone: 'text-emerald-300' },
  FILM: { label: 'Film', tone: 'text-amber-300' },
  TV: { label: 'TV', tone: 'text-violet-300' },
  BOOK: { label: 'Book', tone: 'text-orange-300' },
  OTHER: { label: 'Other', tone: 'text-zinc-300' },
};

/** ANIME, MANGA, GAME, FILM, TV, BOOK or OTHER; movies and shows split on the entry's format. */
export function badgeOf(entry) {
  switch (entry.category) {
    case 'anime':
      return 'ANIME';
    case 'manga':
      return 'MANGA';
    case 'game':
      return 'GAME';
    case 'book':
      return 'BOOK';
    case 'screen':
      return entry.metadata?.format === 'Movie' ? 'FILM' : 'TV';
    default:
      return 'OTHER';
  }
}

/* ---------- cache ---------- */

/** `{ items: { [entryId]: { fetchedAt, releases, news } }, seen: { [newsId]: ts }, feed: { items, fetchedAt }, lastVisit }` */
export function loadRadar() {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (raw && typeof raw.items === 'object') return { items: raw.items, seen: raw.seen || {}, feed: raw.feed || null, lastVisit: Number(raw.lastVisit) || 0 };
  } catch {
    // fall through to an empty cache
  }
  return { items: {}, seen: {}, feed: null, lastVisit: 0 };
}

export function saveRadar(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.warn('Could not save the release radar to LocalStorage', err);
  }
}

/* ---------- dates ---------- */

/** "2026-11-03" → local midnight, or null. */
export function parseDay(text) {
  const m = String(text || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime() : null;
}

const exactDate = (d) => (d?.year && d.month && d.day ? new Date(d.year, d.month - 1, d.day).getTime() : null);

/** AniList's partial dates: "March 2027", "2027", or null. */
function fuzzyDate(d) {
  if (!d?.year) return null;
  if (!d.month) return String(d.year);
  return new Date(d.year, d.month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

const dayText = (ms) => new Date(ms).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

/* ---------- details ---------- */

/** A source's HTML synopsis as short plain text, cut at a sentence where possible (it's cached per item). */
function excerpt(text, max = 420) {
  const clean = cleanSynopsis(text).replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return stop > max / 2 ? cut.slice(0, stop + 1) : `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

const facts = (...list) => list.filter(Boolean);
const minutes = (n) => (n ? `${n} min` : '');

/* ---------- fetching ---------- */

async function getJson(url, signal) {
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${new URL(url).hostname} responded ${res.status}`);
  return res.json();
}

async function aniList(query, variables, signal) {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal,
  });
  if (!res.ok) throw new Error(`AniList responded ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

/** Run `fn` over `items` with at most `limit` in flight (TVmaze allows ~20 calls per 10 s). */
async function pool(items, limit, fn) {
  const results = [];
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]).then(
        (value) => ({ ok: true, value }),
        (error) => ({ ok: false, error }),
      );
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

const chunks = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));

/** Where an entry's release data comes from, read off its id (see lib/search.js), or null. */
function sourceOf(id) {
  let m;
  if ((m = id.match(/^al-(\d+)$/))) return { kind: 'anilist', id: Number(m[1]) };
  if ((m = id.match(/^mal-manga-(\d+)$/))) return { kind: 'mal', type: 'MANGA', id: Number(m[1]) };
  if ((m = id.match(/^mal-(\d+)$/))) return { kind: 'mal', type: 'ANIME', id: Number(m[1]) };
  if ((m = id.match(/^tvmaze-(\d+)$/))) return { kind: 'tvmaze', id: m[1] };
  if (TMDB_KEY && (m = id.match(/^tmdb-(tv|movie)-(\d+)$/))) return { kind: 'tmdb', type: m[1], id: m[2] };
  if (RAWG_KEY && (m = id.match(/^rawg-(\d+)$/))) return { kind: 'rawg', id: m[1] };
  if ((m = id.match(/^wiki-(\d+)$/))) return { kind: 'wiki', id: m[1] };
  if ((m = id.match(/^gb-(.+)$/))) return { kind: 'gbooks', id: m[1] };
  return null;
}

/* ---------- AniList ---------- */

const MEDIA_FIELDS = `id idMal type format status episodes duration siteUrl description(asHtml: false)
  title { romaji english } coverImage { large } startDate { year month day }
  nextAiringEpisode { airingAt episode } trailer { id site thumbnail }`;

const radarQuery = (filter) => /* GraphQL */ `
  query ($ids: [Int]) {
    Page(perPage: 20) {
      media(${filter}) {
        ${MEDIA_FIELDS}
        studios(isMain: true) { nodes { name } }
        streamingEpisodes { title thumbnail url site }
        airingSchedule(notYetAired: true, perPage: 4) { nodes { airingAt episode } }
        relations { edges { relationType node { ${MEDIA_FIELDS} } } }
      }
    }
  }
`;

const AIRED_QUERY = /* GraphQL */ `
  query ($ids: [Int], $since: Int, $until: Int) {
    Page(perPage: 50) {
      airingSchedules(mediaId_in: $ids, airingAt_greater: $since, airingAt_lesser: $until, sort: TIME_DESC) {
        mediaId episode airingAt
      }
    }
  }
`;

const RELATIONS = { SEQUEL: 'Sequel', SIDE_STORY: 'Side story', SPIN_OFF: 'Spin-off', ADAPTATION: 'Adaptation', ALTERNATIVE: 'New version' };
const FORMAT_NAMES = { TV: 'Season', TV_SHORT: 'Season', MOVIE: 'Movie', OVA: 'OVA', ONA: 'ONA', SPECIAL: 'Special' };

const alTitle = (m) => m.title.english || m.title.romaji;

function trailerOf(m) {
  const t = m.trailer;
  if (t?.site === 'youtube') return { url: `https://www.youtube.com/watch?v=${t.id}`, image: t.thumbnail || `https://i.ytimg.com/vi/${t.id}/hqdefault.jpg` };
  if (t?.site === 'dailymotion') return { url: `https://www.dailymotion.com/video/${t.id}`, image: t.thumbnail || '' };
  return null;
}

const aniListFacts = (m) => facts(m.episodes && `${m.episodes} episodes`, minutes(m.duration), m.studios?.nodes?.[0]?.name);

/** A streaming site's page for one episode ("Episode 5 - Title"), or null. */
function streamingEpisode(list, episode) {
  for (const s of list || []) {
    const match = s.title?.match(/^Episode\s+(\d+)\s*[-–:]?\s*(.*)$/i);
    if (match && Number(match[1]) === episode) return { ...s, name: match[2], url: s.url?.replace(/^http:/, 'https:') };
  }
  return null;
}

function upcomingEpisodes(m, base) {
  const nodes = m.airingSchedule?.nodes?.length ? m.airingSchedule.nodes : m.nextAiringEpisode ? [m.nextAiringEpisode] : [];
  return nodes.map(({ airingAt, episode }) => ({
    ...base,
    id: `al-ep-${m.id}-${episode}`,
    kind: 'episode',
    at: airingAt * 1000,
    allDay: false,
    label: `Episode ${episode}${m.episodes ? ` of ${m.episodes}` : ''}`,
    url: m.siteUrl,
    facts: aniListFacts(m),
  }));
}

/** Releases and news for one tracked AniList title (`m`), including its related titles. */
function aniListItems(entryId, m) {
  const releases = upcomingEpisodes(m, { entryId });
  const news = [];

  if (m.status === 'NOT_YET_RELEASED') {
    const at = exactDate(m.startDate);
    if (at) releases.push({ id: `al-start-${m.id}`, entryId, kind: 'premiere', at, allDay: true, label: m.type === 'MANGA' ? 'Serialisation starts' : 'Premiere', url: m.siteUrl, facts: aniListFacts(m) });
    const trailer = trailerOf(m);
    if (trailer) news.push({ id: `al-trailer-${m.id}-${m.trailer.id}`, entryId, kind: 'trailer', headline: 'Trailer released', ...trailer });
  }
  if (m.status === 'HIATUS') {
    news.push({ id: `al-hiatus-${m.id}`, entryId, kind: 'status', headline: 'On hiatus', body: 'AniList lists this title as paused.', url: m.siteUrl });
  }

  for (const { relationType, node } of m.relations?.edges || []) {
    if (!RELATIONS[relationType]) continue;
    const related = { entryId, refId: `al-${node.id}`, title: alTitle(node), cover: node.coverImage?.large || '' };
    const details = { summary: excerpt(node.description), facts: aniListFacts(node) };
    const what =
      relationType === 'ADAPTATION' && node.type === 'ANIME' ? 'Anime adaptation' : `${RELATIONS[relationType]} ${(FORMAT_NAMES[node.format] || '').toLowerCase()}`.trim();

    if (node.status === 'NOT_YET_RELEASED') {
      const at = exactDate(node.startDate);
      const fuzzy = fuzzyDate(node.startDate);
      news.push({
        ...related,
        id: `al-announce-${node.id}`,
        kind: relationType === 'SEQUEL' && FORMAT_NAMES[node.format] === 'Season' ? 'season' : 'announcement',
        headline: `${what} announced: ${related.title}`,
        body: at ? `Premieres ${dayText(at)}.` : fuzzy ? `Expected ${fuzzy}.` : 'No release date yet.',
        url: node.siteUrl,
        ...details,
      });
      if (at) releases.push({ ...related, id: `al-start-${node.id}`, kind: 'premiere', at, allDay: true, label: `${what} premiere`, url: node.siteUrl, ...details });
      const trailer = trailerOf(node);
      if (trailer) news.push({ ...related, id: `al-trailer-${node.id}-${node.trailer.id}`, kind: 'trailer', headline: `Trailer: ${related.title}`, ...trailer });
    } else if (node.status === 'RELEASING' && node.type === 'ANIME' && node.nextAiringEpisode) {
      news.push({ ...related, id: `al-airing-${node.id}`, kind: 'announcement', headline: `${related.title} is airing now`, body: `${what} of a title you track.`, url: node.siteUrl, ...details });
      releases.push(...upcomingEpisodes(node, { ...related, summary: details.summary }));
    }
  }
  return { releases, news };
}

/** AniList items for every AniList / MyAnimeList entry, batched; `{ [entryId]: items }`. */
async function fetchAniList(targets, signal) {
  const out = {};
  const animeIds = new Map(); // AniList id → entry id, for the "recently aired" query
  const airing = new Map(); // AniList id → the media itself, to fill in aired episodes
  const groups = [
    { filter: 'id_in: $ids', list: targets.filter((t) => t.source.kind === 'anilist'), key: (m) => `al-${m.id}` },
    { filter: 'idMal_in: $ids, type: ANIME', list: targets.filter((t) => t.source.type === 'ANIME'), key: (m) => `mal-${m.idMal}` },
    { filter: 'idMal_in: $ids, type: MANGA', list: targets.filter((t) => t.source.type === 'MANGA'), key: (m) => `mal-manga-${m.idMal}` },
  ];
  for (const { filter, list, key } of groups) {
    for (const batch of chunks(list, 20)) {
      const data = await aniList(radarQuery(filter), { ids: batch.map((t) => t.source.id) }, signal);
      for (const t of batch) out[t.entry.id] = { releases: [], news: [] }; // titles AniList no longer knows stay empty
      for (const m of data.Page.media) {
        const entryId = key(m);
        if (!out[entryId]) continue;
        out[entryId] = aniListItems(entryId, m);
        if (m.type === 'ANIME' && m.status === 'RELEASING') {
          animeIds.set(m.id, entryId);
          airing.set(m.id, m);
        }
      }
    }
  }

  if (animeIds.size) {
    const until = Math.floor(Date.now() / 1000);
    for (const ids of chunks([...animeIds.keys()], 50)) {
      const data = await aniList(AIRED_QUERY, { ids, since: until - RECENT_MS / 1000, until }, signal);
      for (const { mediaId, episode, airingAt } of data.Page.airingSchedules) {
        const entryId = animeIds.get(mediaId);
        const media = airing.get(mediaId);
        const stream = streamingEpisode(media.streamingEpisodes, episode);
        out[entryId].news.push({
          id: `al-aired-${mediaId}-${episode}`,
          entryId,
          kind: 'aired',
          at: airingAt * 1000,
          headline: `Episode ${episode} is out`,
          body: stream?.name || '',
          url: stream?.url || media.siteUrl,
          linkLabel: stream?.url && stream.site ? `Watch on ${stream.site}` : '',
          still: stream?.thumbnail || '',
          facts: facts(minutes(media.duration), media.studios?.nodes?.[0]?.name),
        });
      }
    }
  }
  return out;
}

/* ---------- TVmaze, TMDB, RAWG ---------- */

const epLabel = (season, number) => (number ? `S${season} · E${number}` : 'Special');

const tvmazeDetails = (ep, show) => ({
  summary: excerpt(ep.summary),
  still: ep.image?.original || ep.image?.medium || '',
  facts: facts(minutes(ep.runtime), show.network?.name || show.webChannel?.name),
});

async function fetchTvmaze(entryId, id, signal) {
  const show = await getJson(`https://api.tvmaze.com/shows/${id}?embed[]=nextepisode&embed[]=previousepisode&embed[]=seasons`, signal);
  const { nextepisode: next, previousepisode: prev, seasons = [] } = show._embedded || {};
  const releases = [];
  const news = [];
  if (next?.airstamp) {
    const at = Date.parse(next.airstamp);
    const premiere = next.number === 1;
    releases.push({ id: `tvmaze-ep-${next.id}`, entryId, kind: premiere ? 'premiere' : 'episode', at, allDay: !next.airtime, label: `${epLabel(next.season, next.number)}${next.name ? ` · ${next.name}` : ''}`, url: next.url, ...tvmazeDetails(next, show) });
  }
  // Seasons TVmaze lists beyond the last aired one, with a premiere date or still without.
  for (const season of seasons) {
    if (season.number <= (prev?.season || 0)) continue;
    const at = parseDay(season.premiereDate);
    if (at && at + DAY < Date.now()) continue;
    const details = { url: season.url, summary: excerpt(season.summary), facts: facts(season.episodeOrder && `${season.episodeOrder} episodes`, show.network?.name || show.webChannel?.name) };
    news.push({ id: `tvmaze-season-${show.id}-${season.number}`, entryId, kind: 'season', headline: at ? `Season ${season.number} has a premiere date` : `Season ${season.number} is confirmed`, body: at ? `Premieres ${dayText(at)}.` : 'No premiere date yet.', ...details });
    if (at && next?.season !== season.number) releases.push({ id: `tvmaze-season-start-${season.id}`, entryId, kind: 'premiere', at, allDay: true, label: `Season ${season.number} premiere`, ...details });
  }
  if (prev?.airstamp && Date.now() - Date.parse(prev.airstamp) < RECENT_MS) {
    news.push({ id: `tvmaze-aired-${prev.id}`, entryId, kind: 'aired', at: Date.parse(prev.airstamp), headline: `${epLabel(prev.season, prev.number)} is out`, body: prev.name || '', url: prev.url, ...tvmazeDetails(prev, show) });
  }
  return { releases, news };
}

const tmdbEpisodeDetails = (ep, show) => ({
  summary: excerpt(ep.overview),
  still: ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : '',
  facts: facts(minutes(ep.runtime), show.networks?.[0]?.name),
});

async function fetchTmdb(entryId, type, id, signal) {
  const params = new URLSearchParams({ api_key: TMDB_KEY, append_to_response: 'videos' });
  const json = await getJson(`https://api.themoviedb.org/3/${type}/${id}?${params}`, signal);
  const url = `https://www.themoviedb.org/${type}/${id}`;
  const releases = [];
  const news = [];
  const now = Date.now();

  if (type === 'movie') {
    const at = parseDay(json.release_date);
    const details = { summary: excerpt(json.overview), facts: facts(minutes(json.runtime), json.tagline) };
    if (at && at + DAY > now) releases.push({ id: `tmdb-release-${id}`, entryId, kind: 'premiere', at, allDay: true, label: 'Release', url, ...details }), news.push({ id: `tmdb-date-${id}`, entryId, kind: 'release', headline: 'Release date set', body: `${dayText(at)}.`, url, ...details });
    else if (at && now - at < RECENT_MS) news.push({ id: `tmdb-out-${id}`, entryId, kind: 'out', at, headline: 'Out now', url, ...details });
  } else {
    const next = json.next_episode_to_air;
    const at = parseDay(next?.air_date);
    if (at) releases.push({ id: `tmdb-ep-${next.id}`, entryId, kind: next.episode_number === 1 ? 'premiere' : 'episode', at, allDay: true, label: `${epLabel(next.season_number, next.episode_number)}${next.name ? ` · ${next.name}` : ''}`, url, ...tmdbEpisodeDetails(next, json) });
    if (at && next.episode_number === 1) news.push({ id: `tmdb-season-${id}-${next.season_number}`, entryId, kind: 'season', headline: `Season ${next.season_number} has a premiere date`, body: `Premieres ${dayText(at)}.`, url, ...tmdbEpisodeDetails(next, json) });
    const last = json.last_episode_to_air;
    const lastAt = parseDay(last?.air_date);
    if (lastAt && now - lastAt < RECENT_MS) {
      news.push({ id: `tmdb-aired-${last.id}`, entryId, kind: 'aired', at: lastAt, headline: `${epLabel(last.season_number, last.episode_number)} is out`, body: last.name || '', url, ...tmdbEpisodeDetails(last, json) });
    }
  }

  const trailer = (json.videos?.results || [])
    .filter((v) => v.site === 'YouTube' && v.type === 'Trailer' && now - Date.parse(v.published_at) < NEWS_MAX_AGE)
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at))[0];
  if (trailer) {
    news.push({
      id: `tmdb-trailer-${trailer.key}`,
      entryId,
      kind: 'trailer',
      at: Date.parse(trailer.published_at),
      headline: trailer.name || 'Trailer released',
      url: `https://www.youtube.com/watch?v=${trailer.key}`,
      image: `https://i.ytimg.com/vi/${trailer.key}/hqdefault.jpg`,
    });
  }
  return { releases, news };
}

async function fetchRawg(entryId, id, signal) {
  const g = await getJson(`https://api.rawg.io/api/games/${id}?${new URLSearchParams({ key: RAWG_KEY })}`, signal);
  const at = parseDay(g.released);
  const url = `https://rawg.io/games/${g.slug}`;
  const details = {
    summary: excerpt(g.description_raw),
    facts: facts(g.developers?.[0]?.name, ...(g.platforms || []).slice(0, 3).map((p) => p.platform?.name)),
  };
  if (at && at + DAY > Date.now()) {
    return {
      releases: [{ id: `rawg-launch-${id}`, entryId, kind: 'launch', at, allDay: true, label: 'Launch', url, ...details }],
      news: [{ id: `rawg-date-${id}`, entryId, kind: 'release', headline: 'Release date set', body: `${dayText(at)}.`, url, ...details }],
    };
  }
  if (at && Date.now() - at < RECENT_MS) return { releases: [], news: [{ id: `rawg-out-${id}`, entryId, kind: 'out', at, headline: 'Out now', url, ...details }] };
  return { releases: [], news: [] };
}

/* ---------- Wikidata, Google Books ---------- */

const wikiApi = (host, params, signal) => getJson(`https://${host}/w/api.php?${new URLSearchParams({ format: 'json', origin: '*', ...params })}`, signal);

/** Items for a title's release date, known to the day or only roughly. */
function datedItems(entry, id, url, dates) {
  const now = Date.now();
  const label = MANUAL_LABELS[entry.category] || 'Release';
  const next = dates.filter((d) => (d.at || d.until) + DAY > now).sort((a, b) => (a.at || a.until) - (b.at || b.until))[0];
  if (next?.at) {
    return {
      releases: [{ id: `${id}-release`, entryId: entry.id, kind: 'launch', at: next.at, allDay: true, label, url }],
      news: [{ id: `${id}-date-${next.at}`, entryId: entry.id, kind: 'release', headline: 'Release date set', body: `${dayText(next.at)}.`, url }],
    };
  }
  if (next) return { releases: [], news: [{ id: `${id}-window-${next.text}`, entryId: entry.id, kind: 'release', headline: `Expected ${next.text}`, url }] };
  const recent = dates.filter((d) => d.at && now - d.at < RECENT_MS).sort((a, b) => b.at - a.at)[0];
  return { releases: [], news: recent ? [{ id: `${id}-out-${recent.at}`, entryId: entry.id, kind: 'out', at: recent.at, headline: 'Out now', url }] : [] };
}

/** Publication dates (P577) of Wikipedia articles, through their Wikidata items; `{ [entryId]: items }`. */
async function fetchWikidata(targets, signal) {
  const out = {};
  for (const batch of chunks(targets, 50)) {
    const pages = await wikiApi('en.wikipedia.org', { action: 'query', prop: 'pageprops', ppprop: 'wikibase_item', pageids: batch.map((t) => t.source.id).join('|') }, signal);
    await pool(batch, 4, async ({ entry, source }) => {
      const item = pages.query?.pages?.[source.id]?.pageprops?.wikibase_item;
      const url = `https://en.wikipedia.org/?curid=${source.id}`;
      if (!item) {
        out[entry.id] = { releases: [], news: [] };
        return;
      }
      const json = await wikiApi('www.wikidata.org', { action: 'wbgetclaims', entity: item, property: 'P577' }, signal);
      const dates = (json.claims?.P577 || [])
        .filter((claim) => claim.rank !== 'deprecated' && claim.mainsnak?.datavalue)
        .map((claim) => {
          const { time, precision } = claim.mainsnak.datavalue.value;
          const [, y, m] = time.match(/^\+?(\d{4})-(\d{2})/) || [];
          if (!y) return null;
          if (precision >= 11) return { at: parseDay(time.slice(1)) };
          const month = precision === 10 ? Number(m) : 12;
          return { until: new Date(Number(y), month, 0).getTime(), text: fuzzyDate({ year: Number(y), month: precision === 10 ? Number(m) : null }) };
        })
        .filter(Boolean);
      out[entry.id] = datedItems(entry, `wiki-${source.id}`, url, dates);
    });
  }
  return out;
}

async function fetchGoogleBooks(entry, id, signal) {
  const volume = await getJson(`https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(id)}`, signal);
  const at = parseDay(volume.volumeInfo?.publishedDate);
  return datedItems(entry, `gb-${id}`, volume.volumeInfo?.infoLink || '', at ? [{ at }] : []);
}

/**
 * Fetch items for entries whose cache is missing or older than STALE_MS (all
 * of them with `force`). Returns the next cache and how many sources failed;
 * entries whose source failed keep their previous items.
 */
export async function refreshRadar(entries, cache, { force = false, signal } = {}) {
  const now = Date.now();
  const targets = entries
    .map((entry) => ({ entry, source: sourceOf(entry.id) }))
    .filter(({ entry, source }) => {
      const cached = cache.items[entry.id];
      return source && (force || cached?.schema !== ITEM_SCHEMA || now - (cached.fetchedAt || 0) >= STALE_MS);
    });

  let failed = 0;
  const aniTargets = targets.filter((t) => t.source.kind === 'anilist' || t.source.kind === 'mal');
  const wikiTargets = targets.filter((t) => t.source.kind === 'wiki');
  const others = targets.filter((t) => !aniTargets.includes(t) && !wikiTargets.includes(t));

  const [ani, wiki, rest] = await Promise.all([
    aniTargets.length
      ? fetchAniList(aniTargets, signal).catch((err) => {
          if (err.name === 'AbortError') throw err;
          failed += 1;
          return {};
        })
      : {},
    wikiTargets.length
      ? fetchWikidata(wikiTargets, signal).catch((err) => {
          if (err.name === 'AbortError') throw err;
          failed += 1;
          return {};
        })
      : {},
    pool(others, 4, ({ entry, source }) => {
      if (source.kind === 'tvmaze') return fetchTvmaze(entry.id, source.id, signal);
      if (source.kind === 'tmdb') return fetchTmdb(entry.id, source.type, source.id, signal);
      if (source.kind === 'gbooks') return fetchGoogleBooks(entry, source.id, signal);
      return fetchRawg(entry.id, source.id, signal);
    }),
  ]);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  const fresh = { ...ani, ...wiki };
  rest.forEach((r, i) => {
    if (r.ok) fresh[others[i].entry.id] = r.value;
    else failed += 1;
  });

  // Keep only entries still in the library, and date undated news by first sighting.
  const ids = new Set(entries.map((e) => e.id));
  const items = {};
  for (const [id, item] of Object.entries(cache.items)) if (ids.has(id)) items[id] = item;
  for (const [id, item] of Object.entries(fresh)) if (ids.has(id)) items[id] = { ...item, fetchedAt: now, schema: ITEM_SCHEMA };
  const seen = {};
  for (const [id, ts] of Object.entries(cache.seen)) if (now - ts < NEWS_MAX_AGE * 2) seen[id] = ts;
  for (const item of Object.values(items)) for (const n of item.news) seen[n.id] ??= now;

  return { cache: { ...cache, items, seen }, failed };
}

/* ---------- view model ---------- */

const MANUAL_LABELS = { anime: 'Premiere', manga: 'New volume', game: 'Launch', screen: 'Premiere', book: 'Publication', custom: 'Release' };

/** The release (or "is out" news) from an entry's own Next release date. */
function manualItems(entry, now) {
  const at = parseDay(entry.metadata?.releaseDate);
  if (!at) return { releases: [], news: [] };
  const label = entry.metadata.releaseNote || MANUAL_LABELS[entry.category] || 'Release';
  const id = `manual-${entry.id}-${entry.metadata.releaseDate}`;
  if (at + DAY > now) return { releases: [{ id, entryId: entry.id, kind: 'manual', at, allDay: true, label }], news: [] };
  if (now - at < RECENT_MS) return { releases: [], news: [{ id, entryId: entry.id, kind: 'out', at, headline: `${label} is out` }] };
  return { releases: [], news: [] };
}

/**
 * Upcoming releases (soonest first) and news (newest first) for the library,
 * each with its `entry`, a `badge` and, for news, a `time` to show. `allNews` adds
 * the feed's articles about titles outside the library (their `entry` is null).
 */
export function buildRadar(entries, cache, now = Date.now()) {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const releases = new Map();
  const news = new Map();

  for (const entry of entries) {
    const cached = cache.items[entry.id] || { releases: [], news: [] };
    const manual = manualItems(entry, now);
    const badge = badgeOf(entry);
    for (const r of [...cached.releases, ...manual.releases]) {
      if (r.refId && byId.has(r.refId)) continue;
      if (r.at + (r.allDay ? DAY : 0) <= now || releases.has(r.id)) continue;
      releases.set(r.id, { ...r, entry, badge });
    }
    for (const n of [...cached.news, ...manual.news]) {
      if (n.refId && byId.has(n.refId)) continue;
      const time = n.at ?? cache.seen[n.id] ?? now;
      if (now - time > NEWS_MAX_AGE || news.has(n.id)) continue;
      news.set(n.id, { ...n, entry, badge, time, dated: n.at != null });
    }
  }

  const matchEntry = feedMatcher(entries);
  const outside = [];
  for (const item of cache.feed?.items || []) {
    if (now - item.at > NEWS_MAX_AGE) continue;
    const entry = matchEntry(item);
    if (entry) news.set(item.id, { ...item, entry, badge: badgeOf(entry), time: item.at, dated: true });
    else outside.push({ ...item, entry: null, time: item.at, dated: true });
  }

  const newestFirst = (a, b) => b.time - a.time;
  const yours = [...news.values()].sort(newestFirst);
  return {
    releases: [...releases.values()].sort((a, b) => a.at - b.at),
    news: yours,
    allNews: [...yours, ...outside].sort(newestFirst),
  };
}

/** Whether any library entry has a source the radar can query, or a manual date. */
export const isRadarTrackable = (entry) => Boolean(sourceOf(entry.id) || entry.metadata?.releaseDate);
