import { LayoutGrid } from 'lucide-react';
import { CATEGORIES } from '../lib/categories';
import { cn } from '../lib/cn';

const OPTIONS = [{ id: 'all', label: 'All', icon: LayoutGrid }, ...CATEGORIES];

/** Primary navigation: one scrollable row of media categories with live counts. */
export default function CategoryBar({ value, onChange, counts }) {
  return (
    <nav aria-label="Categories" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pt-5 pb-2 sm:mx-0 sm:px-0">
      {OPTIONS.map(({ id, label, icon: Icon }) => {
        const active = id === value;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(id)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95',
              active ? 'bg-white text-zinc-950 shadow-lg shadow-white/10' : 'bg-white/5 text-zinc-300 hover:bg-white/10',
            )}
          >
            <Icon size={15} aria-hidden="true" className={active ? 'text-accent-600' : 'text-zinc-400'} />
            {label}
            <span className="text-xs tabular-nums text-zinc-500">{counts[id] ?? 0}</span>
          </button>
        );
      })}
    </nav>
  );
}
