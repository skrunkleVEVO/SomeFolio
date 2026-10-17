import { useId, useMemo, useState } from 'react';
import { ChevronDown, ExternalLink, Heart, Layers, Minus, Plus, SlidersHorizontal, Trash2, X } from 'lucide-react';
import Sheet from './ui/Sheet';
import Pill from './ui/Pill';
import StarRating from './ui/StarRating';
import CoverArt from './ui/CoverArt';
import MetadataFields, { inputClass, labelClass } from './MetadataFields';
import { useLibrary } from '../context/LibraryContext';
import { useToast } from '../context/ToastContext';
import { CATEGORIES, detailLine, getCategory, progressOf, statusLabel } from '../lib/categories';
import { STATUSES, STATUS_BY_ID } from '../lib/constants';
import { entryFromMedia, progressPatch, statusPatch } from '../lib/entries';
import { baseTitle } from '../lib/franchises';
import { cn } from '../lib/cn';

/**
 * Details drawer for a library entry, or a preview of a search result that
 * isn't in the library yet (`media` without `metadata`).
 */
export default function DetailSheet({ media, onClose }) {
  const { getEntry } = useLibrary();
  const entry = media ? getEntry(media.id) : null;
  const preview = useMemo(() => (media && !media.metadata ? entryFromMedia(media) : media), [media]);
  const item = entry || preview;

  return (
    <Sheet open={Boolean(media)} onClose={onClose} label={item?.title} variant="drawer">
      {({ close }) => item && <DetailBody key={item.id} item={item} entry={entry} close={close} />}
    </Sheet>
  );
}

function DetailBody({ item, entry, close }) {
  return (
    <>
      <Hero item={item} close={close} />
      <div className="space-y-6 px-5 pb-4 pt-5 md:px-7">
        {entry ? <TrackingPanel entry={entry} close={close} /> : <AddPanel preview={item} />}
        <Synopsis text={item.metadata.synopsis} />
        <SourceLink item={item} />
      </div>
    </>
  );
}

function Hero({ item, close }) {
  const category = getCategory(item.category);
  const Icon = category.icon;
  const { banner, altTitle, score, genres } = item.metadata;
  return (
    <div className="relative">
      <div className="relative h-40 overflow-hidden md:h-48">
        {banner ? (
          <img src={banner} alt="" className="h-full w-full object-cover" />
        ) : (
          <CoverArt entry={item} eager className="h-full w-full scale-125 blur-2xl" />
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
        <CoverArt
          entry={item}
          eager
          alt={`${item.title} cover`}
          iconSize={36}
          className="aspect-[2/3] w-28 shrink-0 rounded-xl shadow-2xl shadow-black ring-1 ring-white/15 md:w-36"
        />
        <div className="min-w-0 pb-1">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent-300">
            <Icon size={12} aria-hidden="true" /> {category.label}
          </p>
          <h2 className="text-xl font-extrabold leading-tight tracking-tight md:text-2xl">{item.title}</h2>
          {altTitle && <p className="mt-0.5 truncate text-sm text-zinc-400">{altTitle}</p>}
          <p className="mt-1.5 text-xs font-medium text-zinc-400">{detailLine(item).join(' · ')}</p>
          {score && (
            <p className="mt-1 text-xs text-zinc-500">
              Community score <span className="font-semibold text-emerald-300">{score}%</span>
            </p>
          )}
        </div>
      </div>
      {genres?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5 px-5 md:px-7">
          {genres.map((g) => (
            <span key={g} className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-300 ring-1 ring-white/10">
              {g}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function AddPanel({ preview }) {
  const { addEntry } = useLibrary();
  const toast = useToast();
  const order = ['plan', 'watching', 'completed', 'backlog'];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="mb-3 text-sm font-semibold text-zinc-300">Add to your library</p>
      <div className="grid grid-cols-2 gap-2">
        {order.map((id, i) => {
          const label = statusLabel(STATUS_BY_ID[id], preview.category);
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                addEntry({ ...preview, status: id });
                toast(`Added to ${label}`);
              }}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition active:scale-95',
                i === 0
                  ? 'bg-linear-to-r from-accent-500 to-accent2-600 text-white shadow-lg shadow-accent-500/25 hover:brightness-110'
                  : 'bg-white/5 text-zinc-200 hover:bg-white/10',
              )}
            >
              <span className={`size-2 rounded-full ${STATUS_BY_ID[id].dot}`} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TrackingPanel({ entry, close }) {
  const { updateEntry, removeEntry, restoreEntry } = useLibrary();
  const toast = useToast();
  const status = STATUS_BY_ID[entry.status];

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
            onChange={(e) => updateEntry(entry.id, statusPatch(entry, e.target.value))}
            className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 py-3 pl-9 pr-9 text-base font-semibold text-zinc-100 outline-none transition focus:border-accent-400/60 md:text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id} className="bg-zinc-900">
                {statusLabel(s, entry.category)}
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

      <ProgressPanel entry={entry} />

      {/* Rating */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Your rating</p>
        <StarRating value={entry.rating || 0} onChange={(rating) => updateEntry(entry.id, { rating })} />
      </div>

      <DetailsEditor entry={entry} />
      <VibesField entry={entry} />
      <FranchiseField key={entry.franchise ?? 'auto'} entry={entry} />

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
          placeholder="Highlights, thoughts, who recommended it…"
          className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.03] p-3 text-base leading-relaxed text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-accent-400/60 md:text-sm"
        />
        <p className="mt-1 text-[11px] text-zinc-600">Saved automatically · added {new Date(entry.addedAt).toLocaleDateString()}</p>
      </div>

      <RemoveButton onConfirm={remove} />
    </>
  );
}

/** Episodes, chapters or hours, depending on the category. Hidden for categories without a counter. */
function ProgressPanel({ entry }) {
  const { updateEntry } = useLibrary();
  const toast = useToast();
  const p = progressOf(entry);
  if (!p) return null;
  const { spec, value, total, pct } = p;
  const hours = spec.short === 'h';
  const unit = spec.unit[0].toUpperCase() + spec.unit.slice(1);

  const step = (delta) => {
    const { patch, completed, changed } = progressPatch(entry, delta);
    if (!changed) return;
    updateEntry(entry.id, patch);
    if (completed) toast(`🎉 Finished ${entry.title}! Don't forget to rate it.`);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{hours ? 'Time played' : `${unit}s`}</p>
          <p className="mt-0.5 text-2xl font-extrabold tabular-nums">
            {value}
            <span className="text-base font-semibold text-zinc-500">{hours ? 'h' : ` / ${total ?? '?'}`}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={value <= 0}
            aria-label={`Remove one ${spec.unit}`}
            className="grid size-11 place-items-center rounded-xl bg-white/5 text-zinc-300 transition hover:bg-white/10 active:scale-90 disabled:opacity-30"
          >
            <Minus size={18} />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={Boolean(total) && value >= total}
            className="flex h-11 items-center gap-1.5 rounded-xl bg-linear-to-r from-accent-500 to-accent2-600 px-4 text-sm font-bold text-white shadow-lg shadow-accent-500/25 transition hover:brightness-110 active:scale-95 disabled:opacity-40"
          >
            <Plus size={18} strokeWidth={3} /> 1 {unit}
          </button>
        </div>
      </div>
      {total && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-linear-to-r from-accent-500 to-accent2-400 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

/** Collapsible editor for the title, cover, category and category-specific metadata. */
function DetailsEditor({ entry }) {
  const { updateEntry } = useLibrary();
  const id = useId();
  const [open, setOpen] = useState(false);
  const category = getCategory(entry.category);

  return (
    <div className="rounded-2xl border border-white/10">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400 transition hover:text-zinc-200"
      >
        <SlidersHorizontal size={14} aria-hidden="true" /> Details
        <ChevronDown size={16} className={cn('ml-auto transition', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && (
        <div id={`${id}-panel`} className="space-y-3 border-t border-white/10 p-4">
          <CommitInput key={entry.title} id={`${id}-title`} label="Title" value={entry.title} required onCommit={(title) => updateEntry(entry.id, { title })} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${id}-category`} className={labelClass}>
                Category
              </label>
              <div className="relative">
                <select
                  id={`${id}-category`}
                  value={entry.category}
                  onChange={(e) => updateEntry(entry.id, { category: e.target.value })}
                  className={cn(inputClass, 'appearance-none pr-9')}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id} className="bg-zinc-900">
                      {c.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>
            <CommitInput
              key={entry.coverUrl}
              id={`${id}-cover`}
              label="Cover URL"
              type="url"
              placeholder="https://…"
              value={entry.coverUrl}
              onCommit={(coverUrl) => updateEntry(entry.id, { coverUrl })}
            />
          </div>
          <MetadataFields
            category={entry.category}
            values={entry.metadata}
            exclude={category.progress ? [category.progress.key] : []}
            onChange={(key, value) => updateEntry(entry.id, { metadata: { [key]: value } })}
          />
        </div>
      )}
    </div>
  );
}

/** Text input that saves on blur or Enter, so a half-typed title or URL never syncs. */
function CommitInput({ id, label, value, onCommit, required = false, ...props }) {
  const [draft, setDraft] = useState(value);
  const commit = () => {
    const next = draft.trim();
    if (required && !next) setDraft(value);
    else if (next !== value) onCommit(next);
  };
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        maxLength={500}
        className={inputClass}
        {...props}
      />
    </div>
  );
}

function VibesField({ entry }) {
  const { updateEntry, vibes, addVibe } = useLibrary();
  const [newVibe, setNewVibe] = useState('');

  const toggleVibe = (vibe) => {
    const own = entry.vibes;
    updateEntry(entry.id, { vibes: own.includes(vibe) ? own.filter((v) => v !== vibe) : [...own, vibe] });
  };

  const createVibe = (e) => {
    e.preventDefault();
    const name = newVibe.trim();
    if (!name) return;
    const existing = vibes.find((v) => v.toLowerCase() === name.toLowerCase());
    if (!existing) addVibe(name);
    const tag = existing || name;
    if (!entry.vibes.includes(tag)) updateEntry(entry.id, { vibes: [...entry.vibes, tag] });
    setNewVibe('');
  };

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Vibes</p>
      <div className="flex flex-wrap gap-1.5">
        {vibes.map((v) => (
          <Pill key={v} tone="vibe" active={entry.vibes.includes(v)} onClick={() => toggleVibe(v)}>
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
  );
}

/** Pick, rename or opt out of the franchise this entry stacks under in the grid. */
function FranchiseField({ entry }) {
  const { franchises, setFranchise } = useLibrary();
  const [draft, setDraft] = useState(entry.franchise || '');
  const id = useId();
  const group = franchises.groups.get(franchises.groupOf.get(entry.id));
  const names = useMemo(() => [...franchises.groups.values()].map((g) => g.name), [franchises]);
  const separate = entry.franchise === '';

  const commit = () => {
    const name = draft.trim();
    if (name) setFranchise([entry.id], name);
    else if (entry.franchise) setFranchise([entry.id], null); // cleared a manual name → back to auto
  };

  const others = group ? group.entries.length - 1 : 0;
  const hint = group
    ? `Stacked with ${others} other ${others === 1 ? 'entry' : 'entries'} in ${group.name}${group.manual ? '' : ' (auto-detected)'}.`
    : separate
      ? 'Always shown on its own card.'
      : 'Entries with matching titles stack automatically, across categories too.';

  return (
    <div>
      <label htmlFor={`${id}-franchise`} className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        <Layers size={13} aria-hidden="true" /> Franchise
      </label>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          commit();
          e.currentTarget.querySelector('input')?.blur();
        }}
        className="flex gap-2"
      >
        <input
          id={`${id}-franchise`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          list={`${id}-names`}
          maxLength={80}
          placeholder={separate ? 'Not grouped' : `Auto: ${group && !group.manual ? group.name : baseTitle(entry.title)}`}
          aria-describedby={`${id}-hint`}
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-base text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-accent-400/60 md:text-sm"
        />
        <datalist id={`${id}-names`}>
          {names.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <button
          type="button"
          onClick={() => setFranchise([entry.id], separate ? null : '')}
          aria-pressed={separate}
          className="shrink-0 rounded-xl bg-white/5 px-3 text-xs font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white"
        >
          {separate ? 'Allow grouping' : 'Keep separate'}
        </button>
      </form>
      <p id={`${id}-hint`} className="mt-1 text-[11px] text-zinc-500">
        {hint}
      </p>
    </div>
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

const SOURCE_NAMES = { jikan: 'MyAnimeList', anilist: 'AniList' };

/** Link to the search source's page, or a custom entry's own link (http/https only). */
function SourceLink({ item }) {
  const { url, link, source } = item.metadata;
  const href = url || link;
  if (typeof href !== 'string' || !/^https?:\/\//i.test(href)) return null;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300">
      {SOURCE_NAMES[source] ? `View on ${SOURCE_NAMES[source]}` : 'Open link'} <ExternalLink size={12} />
    </a>
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
