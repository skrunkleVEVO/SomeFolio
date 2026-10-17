import { BookMarked, Dices, Plus, Settings, WifiOff } from 'lucide-react';
import SearchBar from './SearchBar';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default function Header({ category, onSelectMedia, onFilterTag, onAdd, onAddManual, onRandomize, onSettings }) {
  const online = useOnlineStatus();
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-zinc-950/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
        <a href="./" className="flex items-center gap-2.5" aria-label="SomeFolio home">
          <span className="grid size-9 place-items-center rounded-xl bg-linear-to-br from-accent-500 to-accent2-600 shadow-lg shadow-accent-500/30">
            <BookMarked size={18} className="text-white" />
          </span>
          <span className="text-lg font-extrabold tracking-tight">SomeFolio</span>
        </a>

        <div className="order-last w-full md:order-none md:w-auto md:flex-1">
          <SearchBar category={category} onSelect={onSelectMedia} onFilterTag={onFilterTag} onAddManual={onAddManual} />
        </div>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {!online && (
            <span
              role="status"
              title="Showing your saved library. Changes sync when you reconnect."
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300"
            >
              <WifiOff size={14} aria-hidden="true" /> Offline
            </span>
          )}
          <button
            type="button"
            onClick={onRandomize}
            className="hidden items-center gap-2 rounded-xl bg-linear-to-r from-accent-500 to-accent2-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent-500/25 transition hover:brightness-110 active:scale-95 md:inline-flex"
          >
            <Dices size={18} /> What's next?
          </button>
          <button
            type="button"
            onClick={onAdd}
            aria-label="Add entry"
            title="Add a game, book, movie or anything else"
            className="grid size-10 place-items-center rounded-xl border border-accent-400/30 bg-accent-400/10 text-accent-200 transition hover:bg-accent-400/20 hover:text-white"
          >
            <Plus size={20} />
          </button>
          <button
            type="button"
            onClick={onSettings}
            aria-label="Settings, backup and sync"
            className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            <Settings size={19} />
          </button>
        </div>
      </div>
    </header>
  );
}
