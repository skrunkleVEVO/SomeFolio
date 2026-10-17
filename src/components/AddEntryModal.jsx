import { useId, useState } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import Sheet from './ui/Sheet';
import CoverArt from './ui/CoverArt';
import MetadataFields, { inputClass, labelClass } from './MetadataFields';
import { useLibrary } from '../context/LibraryContext';
import { useToast } from '../context/ToastContext';
import { CATEGORIES, getCategory, statusLabel } from '../lib/categories';
import { STATUSES } from '../lib/constants';
import { cn } from '../lib/cn';

/** Manual "Add entry" form; its fields follow the chosen category. */
export default function AddEntryModal({ open, onClose, defaultCategory, defaultTitle, onOpenEntry }) {
  return (
    <Sheet open={open} onClose={onClose} label="Add entry">
      {({ close }) => <AddForm close={close} defaultCategory={defaultCategory} defaultTitle={defaultTitle} onOpenEntry={onOpenEntry} />}
    </Sheet>
  );
}

function AddForm({ close, defaultCategory, defaultTitle = '', onOpenEntry }) {
  const { addEntry } = useLibrary();
  const toast = useToast();
  const id = useId();
  const [category, setCategory] = useState(defaultCategory && defaultCategory !== 'all' ? defaultCategory : CATEGORIES[0].id);
  const [title, setTitle] = useState(defaultTitle);
  const [coverUrl, setCoverUrl] = useState('');
  const [status, setStatus] = useState('plan');
  const [notes, setNotes] = useState('');
  // Kept across category switches, so a shared field like Year survives; only
  // the chosen category's fields are saved.
  const [metadata, setMetadata] = useState({});

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const keys = getCategory(category).fields.map((f) => f.key);
    const own = Object.fromEntries(keys.filter((k) => metadata[k] != null).map((k) => [k, metadata[k]]));
    const entry = addEntry({ title, category, status, coverUrl, notes, metadata: own });
    close();
    toast(`Added ${entry.title}`, { action: { label: 'Open', onClick: () => onOpenEntry(entry) } });
  };

  return (
    <form onSubmit={submit} className="relative space-y-5 px-5 pb-4 pt-8 md:px-7 md:pt-7">
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/5 text-zinc-300 hover:bg-white/10"
      >
        <X size={18} />
      </button>
      <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
        <Plus className="text-accent-400" /> Add entry
      </h2>

      <div role="radiogroup" aria-label="Category" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 md:-mx-7 md:px-7">
        {CATEGORIES.map(({ id: cid, label, icon: Icon }) => {
          const active = cid === category;
          return (
            <button
              key={cid}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setCategory(cid)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition active:scale-95',
                active ? 'border-accent-400/50 bg-accent-400/15 text-accent-100' : 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10',
              )}
            >
              <Icon size={15} aria-hidden="true" /> {label}
            </button>
          );
        })}
      </div>

      <div className="flex gap-4">
        <CoverArt entry={{ category, coverUrl }} alt="Cover preview" iconSize={24} eager className="aspect-[2/3] w-20 shrink-0 rounded-xl ring-1 ring-white/10" />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <label htmlFor={`${id}-title`} className={labelClass}>
              Title
            </label>
            <input
              id={`${id}-title`}
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder={`Name of the ${getCategory(category).noun}`}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`${id}-cover`} className={labelClass}>
              Cover image URL <span className="normal-case tracking-normal text-zinc-600">· optional</span>
            </label>
            <input
              id={`${id}-cover`}
              type="url"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://…"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor={`${id}-status`} className={labelClass}>
          Status
        </label>
        <div className="relative">
          <select id={`${id}-status`} value={status} onChange={(e) => setStatus(e.target.value)} className={cn(inputClass, 'appearance-none pr-9')}>
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id} className="bg-zinc-900">
                {statusLabel(s, category)}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        </div>
      </div>

      <MetadataFields category={category} values={metadata} onChange={(key, value) => setMetadata((m) => ({ ...m, [key]: value }))} />

      <div>
        <label htmlFor={`${id}-notes`} className={labelClass}>
          Notes <span className="normal-case tracking-normal text-zinc-600">· optional</span>
        </label>
        <textarea id={`${id}-notes`} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={cn(inputClass, 'resize-y leading-relaxed')} />
      </div>

      <button
        type="submit"
        disabled={!title.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-accent-500 to-accent2-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-accent-500/25 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
      >
        <Plus size={18} strokeWidth={3} /> Add to {getCategory(category).label}
      </button>
    </form>
  );
}
