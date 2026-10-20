import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'framer-motion';
import {
  ArrowLeft, CalendarDays, CalendarPlus, CirclePause, CirclePlay, Clapperboard, ExternalLink, Megaphone, Newspaper, RefreshCw,
  Sparkles, Tv, WifiOff,
} from 'lucide-react';
import CoverArt from './ui/CoverArt';
import Pill from './ui/Pill';
import { useLibrary } from '../context/LibraryContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useReleaseRadar } from '../hooks/useReleaseRadar';
import { BADGES, isRadarTrackable } from '../lib/radar';
import { cn } from '../lib/cn';

const TABS = [
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'news', label: 'News', icon: Newspaper },
];
const BADGE_ORDER = ['ANIME', 'MANGA', 'GAME', 'FILM', 'TV', 'BOOK', 'OTHER'];
const NEWS_KINDS = {
  announcement: { label: 'Announcement', icon: Megaphone },
  trailer: { label: 'Trailer', icon: Clapperboard },
  aired: { label: 'New episode', icon: Tv },
  out: { label: 'Out now', icon: Sparkles },
  status: { label: 'Status', icon: CirclePause },
};
const SITES = { 'anilist.co': 'AniList', 'www.tvmaze.com': 'TVmaze', 'www.themoviedb.org': 'TMDB', 'rawg.io': 'RAWG' };
const CARD = 'rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur';

/**
 * Release Radar: a calendar of upcoming episodes, premieres and launches for
 * titles in the library, and a news feed of announcements, trailers and new
 * episodes (see lib/radar.js for where each comes from).
 */
export default function ReleaseRadar({ onBack, onOpen }) {
  const { entries } = useLibrary();
  const radar = useReleaseRadar(entries);
  const online = useOnlineStatus();
  const [tab, setTab] = useState('calendar');
  const [type, setType] = useState('all');

  const types = useMemo(() => {
    const present = new Set([...radar.releases, ...radar.news].map((item) => item.badge));
    return BADGE_ORDER.filter((b) => present.has(b));
  }, [radar.releases, radar.news]);
  const ofType = (list) => (type === 'all' ? list : list.filter((item) => item.badge === type));
  const releases = ofType(radar.releases);
  const news = ofType(radar.news);
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
            <p className="mt-1 text-sm text-zinc-500">
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
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw size={15} aria-hidden="true" className={radar.loading ? 'animate-spin' : undefined} /> Refresh
          </button>
        </div>
        {radar.failed > 0 && online && (
          <p role="status" className="mt-3 text-sm text-amber-300/90">
            Some sources didn't answer, so a few titles show their last saved dates. Try Refresh in a minute.
          </p>
        )}

        {radar.releases[0] && <NextUp release={radar.releases[0]} onOpen={onOpen} />}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <LayoutGroup id="radar-tabs">
            <div role="tablist" aria-label="Radar view" className="flex gap-1 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-1">
              {TABS.map(({ id, label, icon: Icon }) => {
                const active = id === tab;
                const count = id === 'calendar' ? releases.length : news.length;
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
                        className="absolute inset-0 rounded-xl bg-white shadow-lg shadow-white/10"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                      />
                    )}
                    <Icon size={15} aria-hidden="true" className={cn('relative', active ? 'text-accent-600' : 'text-zinc-400')} />
                    <span className="relative">{label}</span>
                    <span className="relative text-xs tabular-nums text-zinc-500">{count}</span>
                    {id === 'news' && unread > 0 && !active && (
                      <span className="relative size-2 rounded-full bg-accent-400" aria-label={`${unread} new`} />
                    )}
                  </button>
                );
              })}
            </div>
          </LayoutGroup>

          {types.length > 1 && (
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Media type">
              <Pill active={type === 'all'} onClick={() => setType('all')}>
                All
              </Pill>
              {types.map((b) => (
                <Pill key={b} active={type === b} onClick={() => setType(type === b ? 'all' : b)}>
                  {b}
                </Pill>
              ))}
            </div>
          )}
        </div>

        <div id="radar-panel" role="tabpanel" className="mt-5">
          <AnimatePresence mode="wait" initial={false}>
            {tab === 'calendar' ? (
              <motion.div key="calendar" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
                {releases.length ? (
                  <Calendar releases={releases} onOpen={onOpen} />
                ) : (
                  <Empty icon={CalendarPlus} title={radar.loading ? 'Looking for release dates…' : 'Nothing scheduled yet'} trackable={trackable} />
                )}
              </motion.div>
            ) : (
              <motion.div key="news" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.2 }}>
                {news.length ? (
                  <ul className="space-y-3">
                    {news.map((item) => (
                      <li key={item.id}>
                        <NewsCard item={item} isNew={Boolean(radar.lastVisit) && item.time > radar.lastVisit} onOpen={onOpen} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty icon={Newspaper} title={radar.loading ? 'Checking for news…' : 'No news in the last few weeks'} trackable={trackable} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
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
      className={cn(CARD, 'relative mt-5 flex w-full items-center gap-4 overflow-hidden p-4 text-left transition hover:border-zinc-700 sm:gap-5 sm:p-5')}
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
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-accent-300">
          Next up <Badge badge={release.badge} />
        </p>
        <h2 className="mt-1 line-clamp-2 text-lg font-extrabold leading-tight sm:text-xl">{release.title || entry.title}</h2>
        <p className="mt-0.5 truncate text-sm text-zinc-300">{release.label}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{whenText(release)}</p>
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
  const s = Math.floor(ms / 1000);
  const parts = [
    ['d', Math.floor(s / 86400)],
    ['h', Math.floor((s % 86400) / 3600)],
    ['m', Math.floor((s % 3600) / 60)],
    ['s', s % 60],
  ];
  const label = `Releases in ${parts.map(([u, v]) => `${v}${u}`).join(' ')}`;

  if (compact) {
    const [d, h, m] = parts.map(([, v]) => v);
    return (
      <span role="timer" aria-label={label} className="rounded-full bg-black/50 px-2.5 py-1 text-xs font-bold tabular-nums text-white backdrop-blur">
        {d ? `${d}d ${h}h` : `${h}h ${m}m`}
      </span>
    );
  }
  return (
    <div role="timer" aria-label={label} className="flex gap-1.5">
      {parts.slice(0, allDay ? 3 : 4).map(([unit, value]) => (
        <span key={unit} aria-hidden="true" className="grid w-14 place-items-center rounded-xl border border-white/10 bg-black/40 py-2 backdrop-blur">
          <span className="text-xl font-extrabold tabular-nums leading-none">{String(value).padStart(2, '0')}</span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{unit}</span>
        </span>
      ))}
    </div>
  );
}

/* ---------- calendar ---------- */

function Calendar({ releases, onOpen }) {
  const days = useMemo(() => {
    const map = new Map();
    for (const r of releases) {
      const key = new Date(r.at).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }
    return [...map.values()];
  }, [releases]);

  return (
    <ol className="space-y-6">
      {days.map((list) => (
        <li key={list[0].at}>
          <h3 className="mb-2 flex items-baseline gap-2 text-sm font-bold uppercase tracking-wider text-zinc-300">
            {dayLabel(list[0].at)}
            <span className="text-xs font-medium normal-case tracking-normal text-zinc-500">{shortDate(list[0].at)}</span>
          </h3>
          <ul className={cn(CARD, 'divide-y divide-zinc-800/80 overflow-hidden')}>
            {list.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => onOpen(r.entry)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-white/[0.03] sm:px-4">
                  <span className="w-14 shrink-0 text-xs font-semibold tabular-nums text-zinc-400">{r.allDay ? 'All day' : timeText(r.at)}</span>
                  <CoverArt entry={{ ...r.entry, coverUrl: r.cover || r.entry.coverUrl }} iconSize={16} className="aspect-[2/3] w-9 shrink-0 rounded-lg ring-1 ring-white/10" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-zinc-100">{r.title || r.entry.title}</span>
                    <span className="block truncate text-xs text-zinc-500">{r.label}</span>
                  </span>
                  <Badge badge={r.badge} />
                </button>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

/* ---------- news ---------- */

function NewsCard({ item, isNew, onOpen }) {
  const kind = NEWS_KINDS[item.kind] || NEWS_KINDS.announcement;
  const Icon = kind.icon;
  const site = item.url && siteOf(item.url);

  return (
    <article className={cn(CARD, 'flex gap-3 p-3 sm:gap-4 sm:p-4')}>
      <button type="button" onClick={() => onOpen(item.entry)} aria-label={`Open ${item.entry.title}`} className="shrink-0 self-start">
        <CoverArt entry={{ ...item.entry, coverUrl: item.cover || item.entry.coverUrl }} iconSize={18} className="aspect-[2/3] w-12 rounded-lg ring-1 ring-white/10 sm:w-14" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1 font-semibold text-zinc-300">
            <Icon size={13} aria-hidden="true" className="text-accent-300" /> {kind.label}
          </span>
          <Badge badge={item.badge} />
          <span>{item.dated ? relative(item.time) : `Spotted ${relative(item.time)}`}</span>
          {isNew && <span className="rounded-full bg-accent-400/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent-200">New</span>}
        </p>
        <h3 className="mt-1 font-semibold leading-snug text-zinc-100">{item.headline}</h3>
        <p className="mt-0.5 line-clamp-2 text-sm text-zinc-400">
          {item.entry.title}
          {item.body ? ` · ${item.body}` : ''}
        </p>
        {site && (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent-300 hover:text-accent-200"
          >
            {site} <ExternalLink size={12} aria-hidden="true" />
          </a>
        )}
      </div>
      {item.image && (
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Watch ${item.headline}`}
          className="relative hidden aspect-video w-36 shrink-0 self-center overflow-hidden rounded-xl ring-1 ring-white/10 sm:block"
        >
          <img src={item.image} alt="" loading="lazy" className="h-full w-full object-cover" />
          <span className="absolute inset-0 grid place-items-center bg-black/30">
            <CirclePlay size={30} className="text-white drop-shadow" aria-hidden="true" />
          </span>
        </a>
      )}
    </article>
  );
}

/* ---------- bits ---------- */

function Badge({ badge }) {
  return (
    <span className={cn('shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wider', BADGES[badge] || BADGES.OTHER)}>{badge}</span>
  );
}

function Empty({ icon: Icon, title, trackable }) {
  return (
    <div className={cn(CARD, 'flex flex-col items-center px-6 py-12 text-center')}>
      <Icon size={28} className="mb-3 text-zinc-500" aria-hidden="true" />
      <p className="font-semibold text-zinc-200">{title}</p>
      <p className="mt-1 max-w-md text-sm text-zinc-500">
        {trackable
          ? 'Airing anime, upcoming seasons and launches show up here as their dates are announced.'
          : 'Add anime, manga or shows from search to follow their schedules.'}{' '}
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
  if (day.toDateString() === today.toDateString()) return 'Today';
  if (day.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
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
