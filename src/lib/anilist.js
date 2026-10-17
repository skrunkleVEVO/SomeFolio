// Anime and manga search: AniList GraphQL first, Jikan (MyAnimeList) as a
// fallback when AniList is down or rate-limiting. Both are normalised to the
// same shape (see lib/search.js).

const ANILIST_URL = 'https://graphql.anilist.co';
const JIKAN_URL = 'https://api.jikan.moe/v4';

const SEARCH_QUERY = /* GraphQL */ `
  query ($search: String, $type: MediaType) {
    Page(perPage: 10) {
      media(search: $search, type: $type, sort: SEARCH_MATCH, isAdult: false) {
        id
        idMal
        title { romaji english }
        coverImage { extraLarge large color }
        bannerImage
        episodes
        chapters
        volumes
        format
        seasonYear
        startDate { year }
        genres
        averageScore
        description(asHtml: false)
        studios(isMain: true) { nodes { name } }
        staff(perPage: 1, sort: RELEVANCE) { nodes { name { full } } }
      }
    }
  }
`;

/** Strip HTML / source credits from a synopsis and decode entities. */
export function cleanSynopsis(text) {
  if (!text) return '';
  const withBreaks = text.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>\s*<p>/gi, '\n\n');
  const plain = new DOMParser().parseFromString(withBreaks, 'text/html').body.textContent || '';
  return plain
    .replace(/\((Source|Written by)[^)]*\)/gi, '')
    .replace(/\[Written by MAL Rewrite\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const FORMAT_LABELS = {
  TV: 'TV', TV_SHORT: 'TV Short', MOVIE: 'Movie', SPECIAL: 'Special', OVA: 'OVA', ONA: 'ONA', MUSIC: 'Music',
  MANGA: 'Manga', NOVEL: 'Light Novel', ONE_SHOT: 'One-shot',
};

/** MAL writes people as "Araki, Hirohiko". */
const malName = (name = '') => name.split(', ').reverse().join(' ');

function fromAniList(m, category) {
  const common = {
    source: 'anilist',
    category,
    title: m.title.english || m.title.romaji,
    altTitle: m.title.english && m.title.romaji !== m.title.english ? m.title.romaji : '',
    cover: m.coverImage?.extraLarge || m.coverImage?.large || '',
    banner: m.bannerImage || '',
    color: m.coverImage?.color || '',
    genres: m.genres || [],
    synopsis: cleanSynopsis(m.description),
    format: FORMAT_LABELS[m.format] || m.format || '',
    year: m.seasonYear || m.startDate?.year || null,
    score: m.averageScore || null,
  };
  if (category === 'manga') {
    return {
      id: `al-${m.id}`, // AniList ids are unique across anime and manga
      ...common,
      author: m.staff?.nodes?.[0]?.name?.full || '',
      chapters: m.chapters || null,
      volumes: m.volumes || null,
      url: `https://anilist.co/manga/${m.id}`,
    };
  }
  return {
    id: `al-${m.id}`,
    ...common,
    studio: m.studios?.nodes?.[0]?.name || '',
    episodes: m.episodes || null,
    url: `https://anilist.co/anime/${m.id}`,
  };
}

function fromJikan(a, category) {
  const common = {
    source: 'jikan',
    category,
    title: a.title_english || a.title,
    altTitle: a.title_english && a.title !== a.title_english ? a.title : '',
    cover: a.images?.webp?.large_image_url || a.images?.jpg?.large_image_url || '',
    banner: '',
    color: '',
    genres: [...(a.genres || []), ...(a.themes || [])].map((g) => g.name),
    synopsis: cleanSynopsis(a.synopsis),
    format: a.type || '',
    score: a.score ? Math.round(a.score * 10) : null,
    url: a.url,
  };
  if (category === 'manga') {
    return {
      id: `mal-manga-${a.mal_id}`, // MAL numbers anime and manga separately
      ...common,
      author: malName(a.authors?.[0]?.name),
      chapters: a.chapters || null,
      volumes: a.volumes || null,
      year: a.published?.prop?.from?.year || null,
    };
  }
  return {
    id: `mal-${a.mal_id}`,
    ...common,
    studio: a.studios?.[0]?.name || '',
    episodes: a.episodes || null,
    year: a.year || a.aired?.prop?.from?.year || null,
  };
}

async function searchAniList(query, category, signal) {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: SEARCH_QUERY, variables: { search: query, type: category === 'manga' ? 'MANGA' : 'ANIME' } }),
    signal,
  });
  if (!res.ok) throw new Error(`AniList responded ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data.Page.media.map((m) => fromAniList(m, category));
}

async function searchJikan(query, category, signal) {
  const url = `${JIKAN_URL}/${category}?${new URLSearchParams({ q: query, limit: '10', sfw: 'true' })}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Jikan responded ${res.status}`);
  const json = await res.json();
  return (json.data || []).map((a) => fromJikan(a, category));
}

async function searchAniListOrJikan(query, category, signal) {
  try {
    return await searchAniList(query, category, signal);
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    return searchJikan(query, category, signal);
  }
}

export const searchAnime = (query, { signal } = {}) => searchAniListOrJikan(query, 'anime', signal);
export const searchManga = (query, { signal } = {}) => searchAniListOrJikan(query, 'manga', signal);
