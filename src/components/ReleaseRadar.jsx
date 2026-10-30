import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft, CalendarCheck, CalendarDays, CalendarPlus, ChevronDown, CirclePause, CirclePlay, Clapperboard, ExternalLink, FlaskConical, Layers, Megaphone,
  Newspaper, RefreshCw, Sparkles, TriangleAlert, Tv, WifiOff, Wrench,
} from 'lucide-react';
import CoverArt from './ui/CoverArt';
import Pill from './ui/Pill';
import { useLibrary } from '../context/LibraryContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useReleaseRadar } from '../hooks/useReleaseRadar';
import { progressOf, progressText } from '../lib/categories';
import { BADGES, isRadarTrackable } from '../lib/radar';
import { cn } from '../lib/cn';

const TABS = [
  { id: 'schedule', label: 'Schedule', icon: CalendarDays },
  { id: 'feed', label: 'Feed', icon: Newspaper },
];
const BADGE_ORDER = ['ANIME', 'MANGA', 'GAME', 'FILM', 'TV', 'BOOK', 'OTHER'];
const NEWS_KINDS = {
  announcement: { label: 'Announcement', icon: Megaphone },
  trailer: { label: 'Trailer', icon: Clapperboard },
  aired: { label: 'New episode', icon: Tv },
  out: { label: 'Out now', icon: Sparkles },
  status: { label: 'Status', icon: CirclePause },
  season: { label: 'Season news', icon: Layers },
  release: { label: 'Release date', icon: CalendarCheck },
  beta: { label: 'Beta or demo', icon: FlaskConical },
  leak: { label: 'Leak or rumor', icon: TriangleAlert },
  update: { label: 'Update', icon: Wrench },
};
const FEED_FILTERS = [
  { id: 'releases', label: 'Releases', kinds: ['release', 'out', 'aired'] },
  { id: 'seasons', label: 'Seasons', kinds: ['season'] },
  { id: 'betas', label: 'Betas', kinds: ['beta'] },
  { id: 'leaks', label: 'Leaks', kinds: ['leak'] },
  { id: 'trailers', label: 'Trailers', kinds: ['trailer'] },
  { id: 'announcements', label: 'Announcements', kinds: ['announcement', 'status', 'update'] },
];
const SITES = { 'anilist.co': 'AniList', 'www.tvmaze.com': 'TVmaze', 'www.themoviedb.org': 'TMDB', 'rawg.io': 'RAWG', 'en.wikipedia.org': 'Wikipedia' };
const CARD = 'rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur';

/**
 * Release Radar: a dated schedule of upcoming episodes, premieres and launches
 * for titles in the library, and a feed of announcements, trailers and new
 * episodes (see lib/radar.js for where each comes from). Both stay scannable by
 * date; synopses, stills and links sit in rows that expand on demand.
 */
export default function ReleaseRadar({ onBack, onOpen }) {
  const { entries } = useLibrary();
  const radar = useReleaseRadar(entries);
  const online = useOnlineStatus();
  const [tab, setTab] = useState('schedule');
  const [type, setType] = useState('all');
  const [feedFilter, setFeedFilter] = useState('all');
  const [scope, setScope] = useState(null); // 'yours' | 'all'; until chosen, whichever has something to show

  const types = useMemo(() => {
    const present = new Set([...radar.releases, ...radar.allNews].map((item) => item.badge));
    return BADGE_ORDER.filter((b) => present.has(b));
  }, [radar.releases, radar.allNews]);
  const ofType = (list) => (type === 'all' ? list : list.filter((item) => item.badge === type));
  const releases = ofType(radar.releases);
  const feedScope = scope || (radar.news.length ? 'yours' : 'all');
  const scoped = feedScope === 'all' ? radar.allNews : radar.news;
  const news = ofType(scoped);
  const feedFilters = FEED_FILTERS.filter((f) => scoped.some((n) => f.kinds.includes(n.kind)));
  const activeFeedFilter = FEED_FILTERS.find((f) => f.id === feedFilter);
  const shownNews = activeFeedFilter ? news.filter((n) => activeFeedFilter.kinds.includes(n.kind)) : news;
  const onFeed = tab === 'feed';
  const showFilters = types.length > 1 || (onFeed && feedFilters.length > 1);
  const unread = radar.lastVisit ? radar.news.filter((n) => n.time > radar.lastVisit).length : 0;
  const trackable = entries.some(isRadarTrackable);

  return (
    <MotionConfig reducedMotion="user">
      <section aria-labelledby="radar-title" className="pt-5">
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-zinc-400 transition hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Library
        </button>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 id="radar-title" className="text-2xl font-extrabold tracking-tight">
              Release Radar
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              {!online ? (
                <span className="inline-flex items-center gap-1.5">
                  <WifiOff size={14} aria-hidden="true" /> Offline · showing what was saved {radar.updatedAt ? relative(radar.updatedAt) : ''}
                </span>
              ) : radar.loading ? (
                'Checking for new releases…'
              ) : radar.updatedAt ? (
                `Updated ${relative(radar.updatedAt)}`
              ) : (
                'Upcoming drops and news for the titles you track.'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => radar.refresh()}
            disabled={!online || radar.loading}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/10 active:scale-[0.97] disabled:opacity-50"
          >
            <RefreshCw size={15} aria-hidden="true" className={radar.loading ? 'animate-spin' : undefined} /> Refresh
          </button>
        </div>
        {radar.failed > 0 && online && (
          <p role="status" className="mt-3 text-sm text-amber-300/90">
            Some sources didn't answer, so a few titles show their last saved dates. Try Refresh in a minute.
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <LayoutGroup id="radar-tabs">
            <div role="tablist" aria-label="Radar view" className="flex w-fit gap-1 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-1">
              {TABS.map(({ id, label, icon: Icon }) => {
                const active = id === tab;
                const count = id === 'schedule' ? releases.length : shownNews.length;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls="radar-panel"
                    onClick={() => setTab(id)}
                    className={cn(
                      'relative flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
                      active ? 'text-zinc-950' : 'text-zinc-300 hover:text-white',
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="radar-tab"
                        aria-hidden="true"
                        className="absolute inset-0 rounded-xl bg-white"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                      />
                    )}
                    <Icon size={15} aria-hidden="true" className={cn('relative', active ? 'text-accent-600' : 'text-zinc-400')} />
                    <span className="relative">{label}</span>
                    <span className={cn('relative text-xs tabular-nums', active ? 'text-zinc-500' : 'text-zinc-400')}>{count}</span>
                    {id === 'feed' && unread > 0 && !active && (
                      <span className="relative size-2 rounded-full bg-accent-400" aria-label={`${unread} new`} />
                    )}
                  </button>
                );
              })}
            </div>
          </LayoutGroup>

          {onFeed && (
            <div role="group" aria-label="Whose news" className="flex rounded-lg border border-white/10 p-0.5 text-xs">
              {[
                ['yours', 'Your titles'],
                ['all', 'All news'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={feedScope === id}
                  onClick={() => {
                    setScope(id);
                    setFeedFilter('all');
                  }}
                  className={cn('hit-area rounded-md px-2.5 py-1 font-medium transition-colors', feedScope === id ? 'bg-white/15 text-white' : 'text-zinc-400 hover:text-zinc-200')}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3">
          {showFilters && (
            <div role="group" aria-label="Filter" className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <Pill
                active={type === 'all' && (!onFeed || !activeFeedFilter)}
                onClick={() => {
                  setType('all');
                  setFeedFilter('all');
                }}
              >
                All
              </Pill>
              {onFeed &&
                feedFilters.map((f) => (
                  <Pill key={f.id} active={feedFilter === f.id} onClick={() => setFeedFilter(feedFilter === f.id ? 'all' : f.id)}>
                    {f.label}
                  </Pill>
                ))}
              {onFeed && feedFilters.length > 0 && types.length > 1 && <span className="mx-0.5 h-5 w-px shrink-0 bg-white/10" aria-hidden="true" />}
              {types.length > 1 && types.map((b) => (
                <Pill key={b} active={type === b} onClick={() => setType(type === b ? 'all' : b)}>
                  {BADGES[b].label}
                </Pill>
              ))}
            </div>
          )}
        </div>

        {/* Tabs are switched often, so the panels swap at once and only fade in. */}
        <div id="radar-panel" role="tabpanel" className="mt-4">
          {tab === 'schedule' ? (
            <motion.div key="schedule" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.12 }}>
              {radar.releases[0] && <NextUp release={radar.releases[0]} onOpen={onOpen} />}
              {releases.length ? (
                <Schedule releases={releases} onOpen={onOpen} />
              ) : (
                <Empty icon={CalendarPlus} title={radar.loading ? 'Looking for release dates…' : 'Nothing scheduled yet'} trackable={trackable} />
              )}
            </motion.div>
          ) : (
            <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.12 }}>
              {shownNews.length ? (
                <Feed news={shownNews} lastVisit={radar.lastVisit} onOpen={onOpen} />
              ) : news.length ? (
                <div className={cn(CARD, 'px-6 py-10 text-center text-sm text-zinc-400')}>
                  Nothing here matches.{' '}
                  <button type="button" onClick={() => setFeedFilter('all')} className="font-semibold text-accent-300 hover:text-accent-200">
                    Show everything
                  </button>
                </div>
              ) : feedScope === 'yours' && radar.allNews.length ? (
                <div className={cn(CARD, 'px-6 py-10 text-center text-sm text-zinc-400')}>
                  No news about your titles right now.{' '}
                  <button type="button" onClick={() => setScope('all')} className="font-semibold text-accent-300 hover:text-accent-200">
                    See all news
                  </button>
                </div>
              ) : (
                <Empty icon={Newspaper} title={radar.loading ? 'Checking for news…' : 'No news in the last few weeks'} trackable={trackable} />
              )}
            </motion.div>
          )}
        </div>
      </section>
    </MotionConfig>
  );
}

/* ---------- next up ---------- */

function NextUp({ release, onOpen }) {
  const now = useNow(1000);
  const { entry } = release;
  const cover = release.cover || entry.coverUrl;
  const left = release.at - now;

  return (
    <button
      type="button"
      onClick={() => onOpen(entry)}
      className={cn(CARD, 'relative mb-6 flex w-full items-center gap-4 overflow-hidden p-4 text-left transition-colors hover:border-zinc-700 active:bg-white/[0.03] sm:gap-5 sm:p-5')}
    >
      {cover && <img src={cover} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-2xl" />}
      <div aria-hidden="true" className="absolute inset-0 bg-linear-to-r from-zinc-950/80 via-zinc-950/50 to-accent2-600/20" />
      <CoverArt
        entry={{ ...entry, coverUrl: cover }}
        iconSize={24}
        eager
        className="relative aspect-[2/3] w-16 shrink-0 rounded-xl ring-1 ring-white/10 sm:w-20"
      />
      <div className="relative min-w-0 flex-1">
        <h2 className="line-clamp-2 pr-14 text-lg font-extrabold leading-tight sm:pr-0 sm:text-xl">
          <span className="sr-only">Next up: </span>
          {release.title || entry.title}
        </h2>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-300">
          <Badge badge={release.badge} />
          <span className="truncate">{release.label}</span>
        </p>
        <p className="mt-0.5 text-xs text-zinc-400">{whenText(release)}</p>
      </div>
      <div className="relative hidden shrink-0 sm:block">
        <Countdown ms={left} allDay={release.allDay} />
      </div>
      <div className="absolute right-3 top-3 sm:hidden">
        <Countdown ms={left} allDay={release.allDay} compact />
      </div>
    </button>
  );
}

function Countdown({ ms, allDay, compact }) {
  if (ms <= 0) {
    return <span className="rounded-full bg-accent-400/15 px-3 py-1 text-xs font-bold text-accent-200">Out today</span>;
  }
  const parts = timeParts(ms);
  const label = `Releases in ${parts.map(([u, v]) => `${v}${u}`).join(' ')}`;

  if (compact) {
    return (
      <span role="timer" aria-label={label} className="rounded-full bg-black/50 px-2.5 py-1 text-xs font-bold tabular-nums text-white">
        {leftText(ms)}
      </span>
    );
  }
  return (
    <div role="timer" aria-label={label} className="flex gap-1.5">
      {parts.slice(0, allDay ? 3 : 4).map(([unit, value]) => (
        <span key={unit} aria-hidden="true" className="grid w-14 place-items-center rounded-xl border border-white/10 bg-black/40 py-2">
          <span className="text-xl font-extrabold tabular-nums leading-none">{String(value).padStart(2, '0')}</span>
          <span className="mt-1 text-[11px] font-medium text-zinc-400">{unit}</span>
        </span>
      ))}
    </div>
  );
}

/* ---------- schedule ---------- */

function Schedule({ releases, onOpen }) {
  const [openId, setOpenId] = useState(null); // one row at a time, so the timeline stays scannable
  const days = useMemo(() => byDay(releases, (r) => r.at), [releases]);

  return (
    <ol className="space-y-6">
      {days.map((list) => (
        <li key={list[0].at}>
          <DayHeading ms={list[0].at} />
          <ul className={cn(CARD, 'divide-y divide-zinc-800/80 overflow-hidden')}>
            {list.map((r) => (
              <ReleaseRow key={r.id} release={r} open={openId === r.id} onToggle={() => setOpenId(openId === r.id ? null : r.id)} onOpen={onOpen} />
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

function ReleaseRow({ release: r, open, onToggle, onOpen }) {
  const panelId = `release-${r.id}`;
  return (
    <li>
      {/* The title's button stretches over the row; the cover sits above it and opens the title directly. */}
      <div className="relative flex items-center gap-3 px-3 py-2.5 transition hover:bg-white/[0.03] sm:px-4">
        <span className="w-14 shrink-0 text-xs font-semibold tabular-nums text-zinc-400">{r.allDay ? 'All day' : timeText(r.at)}</span>
        <button type="button" onClick={() => onOpen(r.entry)} aria-label={`Open ${r.entry.title}`} className="relative z-10 shrink-0 rounded-lg">
          <CoverArt entry={{ ...r.entry, coverUrl: r.cover || r.entry.coverUrl }} iconSize={16} className="aspect-[2/3] w-9 rounded-lg ring-1 ring-white/10" />
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          className="min-w-0 flex-1 text-left after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-accent-400"
        >
          <span className={cn('block text-sm font-semibold text-zinc-100', !open && 'truncate')}>{r.title || r.entry.title}</span>
          <span className={cn('mt-0.5 flex items-center gap-1.5 text-xs text-zinc-400', open && 'flex-wrap')}>
            <Badge badge={r.badge} />
            <span className={open ? undefined : 'truncate'}>{r.label}</span>
          </span>
        </button>
        <ChevronDown size={16} aria-hidden="true" className={cn('shrink-0 text-zinc-400 transition-transform duration-200', open && 'rotate-180')} />
      </div>
      <Reveal open={open} id={panelId}>
        <ReleaseDetails release={r} onOpen={onOpen} />
      </Reveal>
    </li>
  );
}

function ReleaseDetails({ release: r, onOpen }) {
  const now = useNow(60000);
  const left = r.at - now;
  const progress = !r.refId && r.entry.status === 'watching' ? progressOf(r.entry) : null;
  const progressLabel = progress && progressText(progress);
  const about = !r.summary && !r.refId ? r.entry.metadata?.synopsis : '';

  return (
    <div className="px-3 pb-3 pt-0.5 sm:px-4">
      <Details
        still={r.still}
        summary={r.summary || about}
        summaryLabel={about ? 'About this title' : ''}
        facts={[left > 0 ? `In ${leftText(left)}` : 'Out today', ...(r.facts || []), progressLabel && `You're at ${progressLabel}`]}
      >
        <button
          type="button"
          onClick={() => onOpen(r.entry)}
          className="hit-area rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-100 transition hover:bg-white/15 active:scale-[0.97]"
        >
          Open in library
        </button>
        <SourceLink item={r} />
      </Details>
    </div>
  );
}

/* ---------- feed ---------- */

function Feed({ news, lastVisit, onOpen }) {
  const days = useMemo(() => byDay(news, (n) => n.time), [news]);
  return (
    <ol className="space-y-6">
      {days.map((list) => (
        <li key={list[0].time}>
          <DayHeading ms={list[0].time} />
          <ul className="space-y-3">
            {list.map((item) => (
              <li key={item.id}>
                <NewsCard item={item} isNew={Boolean(lastVisit) && item.time > lastVisit} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

function NewsCard({ item, isNew, onOpen }) {
  const kind = NEWS_KINDS[item.kind] || NEWS_KINDS.announcement;
  const Icon = kind.icon;
  const [open, setOpen] = useState(false);
  const hasDetails = Boolean(item.summary || item.still); // facts alone aren't worth a tap
  const name = item.entry?.title;
  const subline = [item.kind === 'leak' && 'Unconfirmed', name, item.body].filter(Boolean).join(' · ');
  const panelId = `news-${item.id}`;

  return (
    <article className={cn(CARD, 'flex gap-3 p-3 sm:gap-4 sm:p-4')}>
      {item.entry ? (
        <button type="button" onClick={() => onOpen(item.entry)} aria-label={`Open ${name}`} className="shrink-0 self-start rounded-lg">
          <CoverArt entry={{ ...item.entry, coverUrl: item.cover || item.entry.coverUrl }} iconSize={18} className="aspect-[2/3] w-12 rounded-lg ring-1 ring-white/10 sm:w-14" />
        </button>
      ) : (
        <ArticleThumb item={item} icon={Icon} />
      )}
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-400">
          <span className={cn('inline-flex items-center gap-1 font-semibold', item.kind === 'leak' ? 'text-amber-300' : 'text-zinc-200')}>
            <Icon size={13} aria-hidden="true" className={item.kind === 'leak' ? undefined : 'text-accent-300'} /> {kind.label}
          </span>
          <Badge badge={item.badge} />
          <span>{item.source || (item.dated ? relative(item.time) : 'Spotted')}</span>
          {isNew && <span className="rounded-full bg-accent-400/15 px-1.5 py-0.5 text-[11px] font-semibold text-accent-200">New</span>}
        </p>
        <h3 className="mt-1 font-semibold leading-snug text-zinc-100">{item.headline}</h3>
        {subline && <p className="mt-0.5 line-clamp-2 text-sm text-zinc-400">{subline}</p>}
        {item.image && <TrailerThumb item={item} className="mt-2 block w-full sm:hidden" />}
        {(hasDetails || item.url) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            {hasDetails && (
              <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                aria-controls={open ? panelId : undefined}
                className="hit-area inline-flex items-center gap-1 text-xs font-semibold text-zinc-200 hover:text-white"
              >
                Details <ChevronDown size={13} aria-hidden="true" className={cn('text-zinc-400 transition-transform duration-200', open && 'rotate-180')} />
              </button>
            )}
            <SourceLink item={item} />
          </div>
        )}
        <Reveal open={open} id={panelId}>
          <div className="pt-3">
            <Details still={item.still} summary={item.summary} facts={item.facts} />
          </div>
        </Reveal>
      </div>
      {item.image && <TrailerThumb item={item} className="hidden w-36 shrink-0 self-center sm:block" />}
    </article>
  );
}

/** An article about a title outside the library: its picture, or the kind of news it is. */
function ArticleThumb({ item, icon: Icon }) {
  const [failed, setFailed] = useState(false);
  const className = 'aspect-[2/3] w-12 shrink-0 self-start rounded-lg ring-1 ring-white/10 sm:w-14';
  if (item.thumb && !failed) {
    return <img src={item.thumb} alt="" loading="lazy" onError={() => setFailed(true)} className={cn(className, 'bg-white/5 object-cover')} />;
  }
  return (
    <span aria-hidden="true" className={cn(className, 'grid place-items-center bg-white/5 text-zinc-400')}>
      <Icon size={18} />
    </span>
  );
}

function TrailerThumb({ item, className }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      aria-label={`Watch ${item.headline}`}
      className={cn('relative aspect-video overflow-hidden rounded-xl ring-1 ring-white/10', className)}
    >
      <img src={item.image} alt="" loading="lazy" className="h-full w-full object-cover" />
      <span className="absolute inset-0 grid place-items-center bg-black/30">
        <CirclePlay size={30} className="text-white drop-shadow" aria-hidden="true" />
      </span>
    </a>
  );
}

/* ---------- bits ---------- */

function DayHeading({ ms }) {
  return (
    <h3 className="mb-2 flex items-baseline gap-2 text-sm font-bold text-zinc-100">
      {dayLabel(ms)}
      <span className="text-xs font-medium text-zinc-400">{shortDate(ms)}</span>
    </h3>
  );
}

/** Height reveal for details; its content only mounts while open, so stills load on demand. */
function Reveal({ open, id, children }) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          id={id}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.22, ease: [0.32, 0.72, 0, 1] }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Details({ still, summary, summaryLabel, facts, children }) {
  const [stillFailed, setStillFailed] = useState(false);
  const shownFacts = (facts || []).filter(Boolean);

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {still && !stillFailed && (
        <img
          src={still}
          alt=""
          loading="lazy"
          onError={() => setStillFailed(true)}
          className="aspect-video w-full rounded-xl bg-white/5 object-cover ring-1 ring-white/10 sm:w-44 sm:shrink-0 sm:self-start"
        />
      )}
      <div className="min-w-0 flex-1 space-y-2">
        {shownFacts.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {shownFacts.map((fact) => (
              <li key={fact} className="rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-zinc-300">
                {fact}
              </li>
            ))}
          </ul>
        )}
        {summary && (
          <div>
            {summaryLabel && <p className="mb-0.5 text-xs font-medium text-zinc-400">{summaryLabel}</p>}
            <p className="line-clamp-6 text-sm leading-relaxed text-zinc-300">{summary}</p>
          </div>
        )}
        {children && <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">{children}</div>}
      </div>
    </div>
  );
}

function SourceLink({ item }) {
  if (!item.url) return null;
  return (
    <a href={item.url} target="_blank" rel="noreferrer" className="hit-area inline-flex items-center gap-1 text-xs font-semibold text-accent-300 hover:text-accent-200">
      {item.linkLabel || siteOf(item.url)} <ExternalLink size={12} aria-hidden="true" />
    </a>
  );
}

function Badge({ badge }) {
  const { label, tone } = BADGES[badge] || BADGES.OTHER;
  return <span className={cn('shrink-0 text-xs font-semibold', tone)}>{label}</span>;
}

function Empty({ icon: Icon, title, trackable }) {
  return (
    <div className={cn(CARD, 'flex flex-col items-center px-6 py-12 text-center')}>
      <Icon size={28} className="mb-3 text-zinc-400" aria-hidden="true" />
      <p className="font-semibold text-zinc-200">{title}</p>
      <p className="mt-1 max-w-md text-sm text-zinc-400">
        {trackable
          ? 'Airing anime, upcoming seasons and launches show up here as their dates are announced.'
          : 'Add anime, manga, games, shows or books from search to follow them here.'}{' '}
        For anything else, set a <span className="font-semibold text-zinc-300">Next release</span> date in the title's details.
      </p>
    </div>
  );
}

function useNow(interval) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}

/** Groups a time-sorted list into one array per local day. */
function byDay(list, timeOf) {
  const map = new Map();
  for (const item of list) {
    const key = new Date(timeOf(item)).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return [...map.values()];
}

function timeParts(ms) {
  const s = Math.floor(ms / 1000);
  return [
    ['d', Math.floor(s / 86400)],
    ['h', Math.floor((s % 86400) / 3600)],
    ['m', Math.floor((s % 3600) / 60)],
    ['s', s % 60],
  ];
}

function leftText(ms) {
  const [d, h, m] = timeParts(ms).map(([, v]) => v);
  return d ? `${d}d ${h}h` : `${h}h ${m}m`;
}

function siteOf(url) {
  const host = new URL(url).hostname;
  if (host.endsWith('youtube.com') || host.endsWith('dailymotion.com')) return 'Watch trailer';
  return SITES[host] ? `Open on ${SITES[host]}` : 'Open link';
}

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

function relative(ms) {
  const diff = (ms - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return 'just now';
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  return rtf.format(Math.round(diff / 86400), 'day');
}

function dayLabel(ms) {
  const day = new Date(ms);
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (day.toDateString() === today.toDateString()) return 'Today';
  if (day.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  if (day.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return day.toLocaleDateString(undefined, { weekday: 'long' });
}

function shortDate(ms) {
  const d = new Date(ms);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: sameYear ? undefined : 'numeric' });
}

const timeText = (ms) => new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

function whenText(r) {
  const day = `${dayLabel(r.at)}, ${shortDate(r.at)}`;
  return r.allDay ? day : `${day} · ${timeText(r.at)}`;
}
