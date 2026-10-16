import { Heart } from 'lucide-react';
import { TABS } from '../lib/constants';
import { cn } from '../lib/cn';

export default function LibraryTabs({ value, onChange, counts }) {
  return (
    <nav aria-label="Library sections" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pt-5 pb-3 sm:mx-0 sm:px-0">
      {TABS.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95',
              active ? 'bg-white text-zinc-950 shadow-lg shadow-white/10' : 'bg-white/5 text-zinc-300 hover:bg-white/10',
            )}
          >
            {tab.id === 'favorites' && <Heart size={14} className={active ? 'fill-rose-500 text-rose-500' : ''} />}
            {tab.label}
            <span className={cn('text-xs tabular-nums', active ? 'text-zinc-500' : 'text-zinc-500')}>{counts[tab.id] ?? 0}</span>
          </button>
        );
      })}
    </nav>
  );
}
