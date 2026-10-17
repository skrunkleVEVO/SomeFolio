import { getCategory, progressOf, progressText } from '../lib/categories';
import { cn } from '../lib/cn';

const chip = 'truncate rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-100 backdrop-blur';

/**
 * The category-aware fact on a card's bottom line: episode count for anime and
 * TV, chapter progress for manga and books, platform for games, the first tag
 * for custom entries. Falls back to the category name so the line never jumps.
 */
export default function EntryBadge({ entry, compact = false }) {
  const category = getCategory(entry.category);
  const p = progressOf(entry);
  const text = p && progressText(p);
  const m = entry.metadata;

  switch (category.badge) {
    case 'platform':
      return (
        <span className="flex min-w-0 items-center gap-1.5">
          {m.platform ? <span className={chip}>{m.platform}</span> : <span className="truncate">{category.label}</span>}
          {!compact && text && <span className="shrink-0 tabular-nums">{text}</span>}
        </span>
      );
    case 'tags': {
      const tag = m.customTags?.[0];
      return tag ? <span className={chip}>{tag}</span> : <span className="truncate">{category.label}</span>;
    }
    default:
      return <span className="truncate tabular-nums">{text || m.format || category.label}</span>;
  }
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
