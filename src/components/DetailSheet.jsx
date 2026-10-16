import { useState } from 'react';
import { ChevronDown, ExternalLink, Heart, Minus, Plus, Trash2, X } from 'lucide-react';
import Sheet from './ui/Sheet';
import Pill from './ui/Pill';
import StarRating from './ui/StarRating';
import { useLibrary } from '../context/LibraryContext';
import { useToast } from '../context/ToastContext';
import { STATUSES, STATUS_BY_ID } from '../lib/constants';
import { progressPatch } from '../lib/entries';
import { cn } from '../lib/cn';

export default function DetailSheet({ media, onClose }) {
  const { getEntry } = useLibrary();
  const entry = media ? getEntry(media.id) : null;
  const item = entry || media;

  return (
    <Sheet open={Boolean(media)} onClose={onClose} label={item?.title}>
      {({ close }) => item && <DetailBody key={item.id} item={item} entry={entry} close={close} />}
    </Sheet>
  );
}

function DetailBody({ item, entry, close }) {
  return (
    <>
      <Hero item={item} close={close} />
      <div className="space-y-6 px-5 pb-4 pt-5 md:px-7">
        {entry ? <TrackingPanel entry={entry} close={close} /> : <AddPanel media={item} />}
        <Synopsis text={item.synopsis} />
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300"
          >
            View on {item.source === 'jikan' ? 'MyAnimeList' : 'AniList'} <ExternalLink size={12} />
          </a>
        )}
      </div>
    </>
  );
}

function Hero({ item, close }) {
  const meta = [item.studio, item.year, item.format, item.episodes && `${item.episodes} episodes`].filter(Boolean);
  return (
    <div className="relative">
      <div className="relative h-40 overflow-hidden md:h-48">
        {item.banner ? (
          <img src={item.banner} alt="" className="h-full w-full object-cover" />
        ) : (
          <img src={item.cover} alt="" className="h-full w-full scale-125 object-cover blur-2xl" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-zinc-950/40 to-zinc-950/10" />
      </div>
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="absolute right-3 top-3 z-30 grid size-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
      >
        <X size={18} />
      </button>
      <div className="relative -mt-24 flex items-end gap-4 px-5 md:px-7">
        <img
          src={item.cover}
          alt={`${item.title} poster`}
          className="aspect-[2/3] w-28 shrink-0 rounded-xl object-cover shadow-2xl shadow-black ring-1 ring-white/15 md:w-36"
          style={{ backgroundColor: item.color || '#27272a' }}
        />
        <div className="min-w-0 pb-1">
          <h2 className="text-xl font-extrabold leading-tight tracking-tight md:text-2xl">{item.title}</h2>
          {item.altTitle && <p className="mt-0.5 truncate text-sm text-zinc-400">{item.altTitle}</p>}
          <p className="mt-1.5 text-xs font-medium text-zinc-400">{meta.join(' · ')}</p>
          {item.score && (
            <p className="mt-1 text-xs text-zinc-500">
              Community score <span className="font-semibold text-emerald-300">{item.score}%</span>
            </p>
          )}
        </div>
      </div>
      {item.genres?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5 px-5 md:px-7">
          {item.genres.map((g) => (
            <span key={g} className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-300 ring-1 ring-white/10">
              {g}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function AddPanel({ media }) {
  const { addEntry } = useLibrary();
  const toast = useToast();
  const order = ['plan', 'watching', 'completed', 'hold'];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="mb-3 text-sm font-semibold text-zinc-300">Add to your library</p>
      <div className="grid grid-cols-2 gap-2">
        {order.map((id, i) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              addEntry(media, id);
              toast(`Added to ${STATUS_BY_ID[id].label}`);
            }}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition active:scale-95',
              i === 0
                ? 'bg-linear-to-r from-accent-500 to-accent2-600 text-white shadow-lg shadow-accent-500/25 hover:brightness-110'
                : 'bg-white/5 text-zinc-200 hover:bg-white/10',
            )}
          >
            <span className={`size-2 rounded-full ${STATUS_BY_ID[id].dot}`} />
            {STATUS_BY_ID[id].label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TrackingPanel({ entry, close }) {
  const { updateEntry, removeEntry, restoreEntry, vibes, addVibe } = useLibrary();
  const toast = useToast();
  const [newVibe, setNewVibe] = useState('');
  const status = STATUS_BY_ID[entry.status];
  const pct = entry.episodes ? Math.min(100, (entry.progress / entry.episodes) * 100) : 0;

  const step = (delta) => {
    const { patch, completed, changed } = progressPatch(entry, delta);
    if (!changed) return;
    updateEntry(entry.id, patch);
    if (completed) toast(`🎉 Finished ${entry.title}! Don't forget to rate it.`);
  };

  const toggleVibe = (vibe) => {
    const own = entry.vibes || [];
    updateEntry(entry.id, { vibes: own.includes(vibe) ? own.filter((v) => v !== vibe) : [...own, vibe] });
  };

  const createVibe = (e) => {
    e.preventDefault();
    const name = newVibe.trim();
    if (!name) return;
    const existing = vibes.find((v) => v.toLowerCase() === name.toLowerCase());
    if (!existing) addVibe(name);
    const tag = existing || name;
    if (!entry.vibes?.includes(tag)) updateEntry(entry.id, { vibes: [...(entry.vibes || []), tag] });
    setNewVibe('');
  };

  const remove = () => {
    removeEntry(entry.id);
    close();
    toast(`Removed ${entry.title}`, { action: { label: 'Undo', onClick: () => restoreEntry(entry) }, duration: 5000 });
  };

  return (
    <>
      {/* Status + favorite */}
      <div className="flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Status</span>
          <span className={`pointer-events-none absolute left-3.5 top-1/2 size-2 -translate-y-1/2 rounded-full ${status?.dot}`} />
          <select
            value={entry.status}
            onChange={(e) => {
              const next = e.target.value;
              const patch = { status: next };
              if (next === 'completed' && entry.episodes) patch.progress = entry.episodes;
              updateEntry(entry.id, patch);
            }}
            className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 py-3 pl-9 pr-9 text-base font-semibold text-zinc-100 outline-none transition focus:border-accent-400/60 md:text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id} className="bg-zinc-900">
                {s.label}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        </label>
        <button
          type="button"
          onClick={() => updateEntry(entry.id, { favorite: !entry.favorite })}
          aria-pressed={entry.favorite}
          aria-label={entry.favorite ? 'Remove from favorites' : 'Add to favorites'}
          className={cn(
            'grid w-12 place-items-center rounded-xl border transition active:scale-90',
            entry.favorite ? 'border-rose-500/40 bg-rose-500/15 text-rose-400' : 'border-white/10 bg-white/5 text-zinc-400 hover:text-rose-300',
          )}
        >
          <Heart size={20} className={entry.favorite ? 'fill-rose-500' : ''} />
        </button>
      </div>

      {/* Progress */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Progress</p>
            <p className="mt-0.5 text-2xl font-extrabold tabular-nums">
              {entry.progress}
              <span className="text-base font-semibold text-zinc-500"> / {entry.episodes ?? '?'}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => step(-1)}
              disabled={entry.progress <= 0}
              aria-label="Remove one episode"
              className="grid size-11 place-items-center rounded-xl bg-white/5 text-zinc-300 transition hover:bg-white/10 active:scale-90 disabled:opacity-30"
            >
              <Minus size={18} />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              disabled={Boolean(entry.episodes) && entry.progress >= entry.episodes}
              className="flex h-11 items-center gap-1.5 rounded-xl bg-linear-to-r from-accent-500 to-accent2-600 px-4 text-sm font-bold text-white shadow-lg shadow-accent-500/25 transition hover:brightness-110 active:scale-95 disabled:opacity-40"
            >
              <Plus size={18} strokeWidth={3} /> 1 Episode
            </button>
          </div>
        </div>
        {entry.episodes && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-linear-to-r from-accent-500 to-accent2-400 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>

      {/* Rating */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Your rating</p>
        <StarRating value={entry.rating || 0} onChange={(rating) => updateEntry(entry.id, { rating })} />
      </div>

      {/* Vibes */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Vibes</p>
        <div className="flex flex-wrap gap-1.5">
          {vibes.map((v) => (
            <Pill key={v} tone="vibe" active={entry.vibes?.includes(v)} onClick={() => toggleVibe(v)}>
              {v}
            </Pill>
          ))}
          <form onSubmit={createVibe} className="flex">
            <input
              value={newVibe}
              onChange={(e) => setNewVibe(e.target.value)}
              placeholder="+ New vibe"
              aria-label="Create a new vibe tag"
              maxLength={28}
              className="w-28 rounded-full border border-dashed border-white/20 bg-transparent px-3 py-1 text-base text-zinc-200 placeholder:text-zinc-500 outline-none focus:w-40 focus:border-accent-400/60 md:text-xs"
            />
          </form>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor={`notes-${entry.id}`} className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Notes
        </label>
        <textarea
          id={`notes-${entry.id}`}
          value={entry.notes || ''}
          onChange={(e) => updateEntry(entry.id, { notes: e.target.value })}
          rows={4}
          placeholder="Favorite episodes, thoughts, who recommended it…"
          className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.03] p-3 text-base leading-relaxed text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-accent-400/60 md:text-sm"
        />
        <p className="mt-1 text-[11px] text-zinc-600">Saved automatically · added {new Date(entry.addedAt).toLocaleDateString()}</p>
      </div>

      <RemoveButton onConfirm={remove} />
    </>
  );
}

function RemoveButton({ onConfirm }) {
  const [armed, setArmed] = useState(false);
  return (
    <button
      type="button"
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      onBlur={() => setArmed(false)}
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
        armed ? 'bg-rose-500/15 text-rose-300' : 'text-zinc-500 hover:text-rose-300',
      )}
    >
      <Trash2 size={15} /> {armed ? 'Tap again to remove' : 'Remove from library'}
    </button>
  );
}

function Synopsis({ text }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;
  const long = text.length > 320;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Synopsis</p>
      <p className={cn('whitespace-pre-line text-sm leading-relaxed text-zinc-300', !expanded && long && 'line-clamp-5')}>{text}</p>
      {long && (
        <button type="button" onClick={() => setExpanded((x) => !x)} className="mt-1 text-sm font-semibold text-accent-300">
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}
