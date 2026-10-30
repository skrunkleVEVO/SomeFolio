import { Star } from 'lucide-react';
import { getCategory, progressOf, progressText, statusLabel } from '../lib/categories';
import { STATUS_BY_ID } from '../lib/constants';
import { cn } from '../lib/cn';

/**
 * A card's bottom line, one status dot and one line of text: progress while a
 * title is active, otherwise its status, plus the platform or first tag where
 * the category has one. Compact cards show the text only for active titles.
 */
export default function EntryBadge({ entry, compact = false }) {
  const category = getCategory(entry.category);
  const status = STATUS_BY_ID[entry.status];
  const label = statusLabel(status, entry.category);
  const p = progressOf(entry);
  const progress = (entry.status === 'watching' || entry.status === 'hold') && p ? progressText(p) : '';
  const extra = compact ? '' : category.badge === 'platform' ? entry.metadata.platform : category.badge === 'tags' ? entry.metadata.customTags?.[0] : '';
  const text = [progress || (compact ? '' : label), extra].filter(Boolean).join(' · ');

  return (
    <span className="flex min-w-0 items-center gap-1.5" title={label}>
      <span className={`size-1.5 shrink-0 rounded-full ${status?.dot}`} aria-hidden="true" />
      {!text.startsWith(label) && <span className="sr-only">{label}</span>}
      {text && <span className="truncate tabular-nums">{text}</span>}
    </span>
  );
}

/** Thin progress bar for cards and rows, shown only when it says something. */
export function ProgressBar({ entry, className }) {
  const p = progressOf(entry);
  if (!p?.total) return null;
  const reading = getCategory(entry.category).badge === 'bar';
  const active = entry.status === 'watching' || entry.status === 'hold';
  if (!active && !(reading && p.value > 0 && entry.status !== 'completed')) return null;
  return (
    <span className={cn('block h-1 overflow-hidden rounded-full bg-white/15', className)}>
      <span className="block h-full rounded-full bg-linear-to-r from-accent-500 to-accent2-400" style={{ width: `${p.pct}%` }} />
    </span>
  );
}

/** Keeps the title legible over the bottom of a cover and leaves the top of the art untouched. */
export function CoverScrim() {
  return <div className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-black via-black/70 to-transparent" />;
}

/** The one chip allowed over a cover's art, top left. */
export function CoverChip({ children }) {
  return (
    <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-1 text-[11px] font-bold leading-none tabular-nums text-zinc-100 backdrop-blur">
      {children}
    </span>
  );
}

export function RatingText({ value }) {
  return (
    <span className="flex shrink-0 items-center gap-0.5 tabular-nums text-amber-300">
      <Star size={11} className="fill-amber-300" aria-hidden="true" /> {value}
    </span>
  );
}
