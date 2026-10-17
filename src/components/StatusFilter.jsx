import { Heart } from 'lucide-react';
import { statusLabel } from '../lib/categories';
import { TABS } from '../lib/constants';
import { cn } from '../lib/cn';

/**
 * Secondary filter within the chosen category. Labels follow the category
 * ("Reading", "Plan to Play"); empty statuses are hidden to keep the row short.
 */
export default function StatusFilter({ value, onChange, counts, category }) {
  const tabs = TABS.filter((t) => t.id === 'all' || t.id === value || counts[t.id] > 0);
  return (
    <nav aria-label="Status" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-95',
              active ? 'bg-white/12 text-white ring-1 ring-white/15' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200',
            )}
          >
            {tab.dot && <span className={`size-1.5 rounded-full ${tab.dot}`} aria-hidden="true" />}
            {tab.id === 'favorites' && <Heart size={12} className={active ? 'fill-rose-500 text-rose-500' : ''} aria-hidden="true" />}
            {tab.dot ? statusLabel(tab, category) : tab.label}
            <span className="tabular-nums text-zinc-500">{counts[tab.id] ?? 0}</span>
          </button>
        );
      })}
    </nav>
  );
}
