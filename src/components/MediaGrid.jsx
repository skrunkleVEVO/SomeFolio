import { Clapperboard, FilterX } from 'lucide-react';
import MediaCard from './MediaCard';

const GRID = {
  compact: 'grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8',
  comfortable: 'grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
  large: 'grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
};

export default function MediaGrid({ entries, onOpen, isLibraryEmpty, onClearFilters, density = 'comfortable' }) {
  if (isLibraryEmpty) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
        <span className="mb-5 grid size-16 place-items-center rounded-2xl bg-linear-to-br from-accent-500/20 to-accent2-500/20 ring-1 ring-accent-400/20">
          <Clapperboard size={28} className="text-accent-300" />
        </span>
        <h2 className="text-xl font-bold">Your shelf is empty</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Search for an anime above — posters, studios, episode counts and synopses fill in automatically.
        </p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center text-zinc-400">
        <FilterX size={28} className="mb-3 text-zinc-500" />
        <p className="text-sm">Nothing here matches.</p>
        <button type="button" onClick={onClearFilters} className="mt-3 text-sm font-semibold text-accent-300 hover:text-accent-200">
          Show everything
        </button>
      </div>
    );
  }

  return (
    <div className={`grid ${GRID[density] || GRID.comfortable}`}>
      {entries.map((entry) => (
        <MediaCard key={entry.id} entry={entry} onOpen={onOpen} compact={density === 'compact'} />
      ))}
    </div>
  );
}
