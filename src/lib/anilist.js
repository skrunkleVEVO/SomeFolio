// Anime search: AniList GraphQL first, Jikan (MyAnimeList) as a fallback when
// AniList is down or rate-limiting. Both are normalised to the same shape.

const ANILIST_URL = 'https://graphql.anilist.co';
const JIKAN_URL = 'https://api.jikan.moe/v4/anime';

const SEARCH_QUERY = /* GraphQL */ `
  query ($search: String) {
    Page(perPage: 10) {
      media(search: $search, type: ANIME, sort: SEARCH_MATCH, isAdult: false) {
        id
        idMal
        title { romaji english }
        coverImage { extraLarge large color }
        bannerImage
        episodes
        format
        seasonYear
        genres
        averageScore
        description(asHtml: false)
        studios(isMain: true) { nodes { name } }
      }
    }
  }
`;

const cache = new Map();

/** Strip HTML / source credits from a synopsis and decode entities. */
export function cleanSynopsis(text) {
  if (!text) return '';
  const withBreaks = text.replace(/<br\s*\/?>/gi, '\n');
  const plain = new DOMParser().parseFromString(withBreaks, 'text/html').body.textContent || '';
  return plain
    .replace(/\((Source|Written by)[^)]*\)/gi, '')
    .replace(/\[Written by MAL Rewrite\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const FORMAT_LABELS = { TV: 'TV', TV_SHORT: 'TV Short', MOVIE: 'Movie', SPECIAL: 'Special', OVA: 'OVA', ONA: 'ONA', MUSIC: 'Music' };

function fromAniList(m) {
  return {
    id: `al-${m.id}`,
    source: 'anilist',
    title: m.title.english || m.title.romaji,
    altTitle: m.title.english && m.title.romaji !== m.title.english ? m.title.romaji : '',
    cover: m.coverImage?.extraLarge || m.coverImage?.large || '',
    banner: m.bannerImage || '',
    color: m.coverImage?.color || '',
    studio: m.studios?.nodes?.[0]?.name || '',
    episodes: m.episodes || null,
    genres: m.genres || [],
    synopsis: cleanSynopsis(m.description),
    format: FORMAT_LABELS[m.format] || m.format || '',
    year: m.seasonYear || null,
    score: m.averageScore || null,
    url: `https://anilist.co/anime/${m.id}`,
  };
}

function fromJikan(a) {
  return {
    id: `mal-${a.mal_id}`,
    source: 'jikan',
    title: a.title_english || a.title,
    altTitle: a.title_english && a.title !== a.title_english ? a.title : '',
    cover: a.images?.webp?.large_image_url || a.images?.jpg?.large_image_url || '',
    banner: '',
    color: '',
    studio: a.studios?.[0]?.name || '',
    episodes: a.episodes || null,
    genres: [...(a.genres || []), ...(a.themes || [])].map((g) => g.name),
    synopsis: cleanSynopsis(a.synopsis),
    format: a.type || '',
    year: a.year || a.aired?.prop?.from?.year || null,
    score: a.score ? Math.round(a.score * 10) : null,
    url: a.url,
  };
}

async function searchAniList(query, signal) {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: SEARCH_QUERY, variables: { search: query } }),
    signal,
  });
  if (!res.ok) throw new Error(`AniList responded ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data.Page.media.map(fromAniList);
}

async function searchJikan(query, signal) {
  const url = `${JIKAN_URL}?${new URLSearchParams({ q: query, limit: '10', sfw: 'true' })}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Jikan responded ${res.status}`);
  const json = await res.json();
  return (json.data || []).map(fromJikan);
}

export async function searchAnime(query, { signal } = {}) {
  const key = query.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key);
  let results;
  try {
    results = await searchAniList(query, signal);
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    results = await searchJikan(query, signal);
  }
  cache.set(key, results);
  return results;
}
