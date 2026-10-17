import { useState } from 'react';
import { Check, Layers, Pencil, Plus, Star, Unlink, X } from 'lucide-react';
import Sheet from './ui/Sheet';
import { ProgressBar } from './EntryBadge';
import CoverArt from './ui/CoverArt';
import { useLibrary } from '../context/LibraryContext';
import { useToast } from '../context/ToastContext';
import { useQuickProgress } from '../hooks/useQuickProgress';
import { getCategory, progressOf, progressText, statusLabel } from '../lib/categories';
import { STATUS_BY_ID } from '../lib/constants';
import { franchiseStats, normalizeName, partLabel } from '../lib/franchises';
import { cn } from '../lib/cn';

/**
 * Drawer listing every part of a franchise in release order (across categories), with quick +1,
 * rename and ungroup. `onGroupIdChange` follows the hub when a rename changes its id.
 */
export default function FranchiseHub({ group, onClose, onOpenEntry, onGroupIdChange }) {
  return (
    <Sheet open={Boolean(group)} onClose={onClose} label={group ? `${group.name} franchise` : undefined} variant="drawer">
      {({ close }) =>
        group && <HubBody key={group.id} group={group} close={close} onOpenEntry={onOpenEntry} onGroupIdChange={onGroupIdChange} />
      }
    </Sheet>
  );
}

function HubBody({ group, close, onOpenEntry, onGroupIdChange }) {
  const stats = franchiseStats(group);
  const front = stats.inProgress[0] || group.entries.at(-1);
  const mixed = stats.categories.length > 1;
  const meta = [`${stats.total} entries`, `${stats.completed} completed`, mixed && stats.categories.map((c) => getCategory(c).label).join(' + ')];

  return (
    <>
      <div className="relative overflow-hidden px-5 pb-5 pt-8 md:px-7 md:pt-7">
        <CoverArt entry={front} eager className="absolute inset-0 h-full w-full scale-125 opacity-40 blur-2xl" />
        <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/30" />
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
        >
          <X size={18} />
        </button>
        <div className="relative">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent-300">
            <Layers size={13} aria-hidden="true" /> Franchise{!group.manual && ' · auto-detected'}
          </p>
          <TitleEditor group={group} onGroupIdChange={onGroupIdChange} />
          <p className="mt-1.5 text-xs font-medium text-zinc-400">
            {meta.filter(Boolean).join(' · ')}
            {stats.avgRating > 0 && (
              <span className="ml-1.5 inline-flex items-center gap-0.5 text-amber-300">
                · <Star size={11} className="fill-amber-300" aria-hidden="true" /> {stats.avgRating} avg
              </span>
            )}
          </p>
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label="Parts completed"
            aria-valuemin={0}
            aria-valuemax={stats.total}
            aria-valuenow={stats.completed}
          >
            <div
              className="h-full rounded-full bg-linear-to-r from-accent-500 to-accent2-400 transition-all duration-500"
              style={{ width: `${(stats.completed / stats.total) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <ol className="space-y-1.5 px-3 md:px-5" aria-label="Parts in release order">
        {group.entries.map((entry, i) => (
          <PartRow
            key={entry.id}
            index={i + 1}
            entry={entry}
            label={partLabel(entry, group.name)}
            showCategory={mixed}
            onOpen={() => onOpenEntry(entry)}
          />
        ))}
      </ol>

      <UngroupButton group={group} close={close} />
    </>
  );
}

function TitleEditor({ group, onGroupIdChange }) {
  const { setFranchise } = useLibrary();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);

  const save = (e) => {
    e.preventDefault();
    const next = name.trim();
    setEditing(false);
    if (!next || next === group.name) return;
    setFranchise(
      group.entries.map((e) => e.id),
      next,
    );
    onGroupIdChange(`franchise:${normalizeName(next)}`);
  };

  if (editing) {
    return (
      <form onSubmit={save} className="mt-1 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), setEditing(false))}
          aria-label="Franchise name"
          maxLength={80}
          autoFocus
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-base font-bold text-zinc-100 outline-none focus:border-accent-400/60 md:text-lg"
        />
        <button type="submit" aria-label="Save name" className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-white hover:bg-white/15">
          <Check size={18} />
        </button>
      </form>
    );
  }

  return (
    <div className="mt-1 flex items-start gap-2 pr-10">
      <h2 className="text-xl font-extrabold leading-tight tracking-tight md:text-2xl">{group.name}</h2>
      <button
        type="button"
        onClick={() => {
          setName(group.name);
          setEditing(true);
        }}
        aria-label="Rename franchise"
        className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg text-zinc-400 transition hover:bg-white/10 hover:text-white"
      >
        <Pencil size={15} />
      </button>
    </div>
  );
}

function PartRow({ index, entry, label, showCategory, onOpen }) {
  const addOne = useQuickProgress();
  const status = STATUS_BY_ID[entry.status];
  const category = getCategory(entry.category);
  const p = progressOf(entry);
  const meta = [showCategory && category.label, entry.metadata.year, entry.metadata.format, p && progressText(p)];

  return (
    <li className="group relative flex items-center rounded-2xl transition hover:bg-white/[0.04]">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400">
        <span className="w-5 shrink-0 text-center text-xs font-bold tabular-nums text-zinc-500" aria-hidden="true">
          {index}
        </span>
        <CoverArt entry={entry} iconSize={18} className="h-16 w-11 shrink-0 rounded-md ring-1 ring-white/10" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-zinc-100">{label}</span>
          <span className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-zinc-400">
            <span className={`size-1.5 shrink-0 rounded-full ${status?.dot}`} aria-hidden="true" />
            {statusLabel(status, entry.category)}
            {meta.filter(Boolean).map((m) => (
              <span key={m}>· {m}</span>
            ))}
          </span>
          <ProgressBar entry={entry} className="mt-1.5 bg-white/10" />
        </span>
        {entry.rating > 0 && (
          <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-amber-300">
            <Star size={12} className="fill-amber-300" aria-hidden="true" /> {entry.rating}
          </span>
        )}
      </button>
      {entry.status === 'watching' && p && (
        <button
          type="button"
          onClick={() => addOne(entry)}
          aria-label={`Add one ${p.spec.unit} to ${entry.title}`}
          className="mr-2 flex h-8 shrink-0 items-center gap-0.5 rounded-full bg-white/90 px-2.5 text-xs font-bold text-zinc-950 shadow-lg transition hover:bg-white active:scale-90"
        >
          <Plus size={14} strokeWidth={3} />
          {p.spec.short === 'h' ? '1h' : '1'}
        </button>
      )}
    </li>
  );
}

function UngroupButton({ group, close }) {
  const { setFranchise } = useLibrary();
  const toast = useToast();
  const [armed, setArmed] = useState(false);

  const ungroup = () => {
    // Remember each entry's setting so Undo restores auto and manual members alike.
    const previous = new Map();
    for (const e of group.entries) {
      const key = e.franchise ?? null;
      previous.set(key, [...(previous.get(key) || []), e.id]);
    }
    setFranchise(
      group.entries.map((e) => e.id),
      '',
    );
    close();
    toast(`Ungrouped ${group.name}`, {
      action: { label: 'Undo', onClick: () => previous.forEach((ids, name) => setFranchise(ids, name)) },
      duration: 5000,
    });
  };

  return (
    <div className="px-5 pt-4 md:px-7">
      <button
        type="button"
        onClick={() => (armed ? ungroup() : setArmed(true))}
        onBlur={() => setArmed(false)}
        className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
          armed ? 'bg-rose-500/15 text-rose-300' : 'text-zinc-500 hover:text-rose-300',
        )}
      >
        <Unlink size={15} /> {armed ? 'Tap again to show these separately' : 'Ungroup franchise'}
      </button>
    </div>
  );
}
