import { BookMarked, Dices, LogIn, Plus, Radar, Settings, WifiOff } from 'lucide-react';
import SearchBar from './SearchBar';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useLibrary } from '../context/LibraryContext';
import { cn } from '../lib/cn';

export default function Header({ category, search, onSelectMedia, onSearch, onFilterTag, onAdd, onAddManual, onRandomize, onRadar, radarOpen, onSettings, onAccount }) {
  const online = useOnlineStatus();
  const { cloud } = useLibrary();
  const signedIn = Boolean(cloud.user);
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-zinc-950/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      {/*
        Layout by width:
        - below lg: row 1 = logo + actions, row 2 = full-width search (always, so it never squishes)
        - lg and up: one row, search fills the middle; "What's next?" stays icon-only until xl to leave it room
        Row 1 is sized so it never wraps on its own, down to 320px.
      */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-3 px-4 py-3 sm:gap-x-4 sm:px-6">
        <a href="./" className="flex shrink-0 items-center gap-2.5" aria-label="SomeFolio home">
          <span className="grid size-9 place-items-center rounded-xl bg-linear-to-br from-accent-500 to-accent2-600">
            <BookMarked size={18} className="text-white" />
          </span>
          <span className="hidden text-lg font-extrabold tracking-tight min-[400px]:inline">SomeFolio</span>
        </a>

        <div className="order-last w-full lg:order-none lg:w-auto lg:min-w-0 lg:flex-1">
          <SearchBar
            category={category}
            submitted={search}
            onSelect={onSelectMedia}
            onSubmit={onSearch}
            onFilterTag={onFilterTag}
            onAddManual={onAddManual}
          />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 lg:ml-0">
          {!online && (
            <span
              role="status"
              title="Showing your saved library. Changes sync when you reconnect."
              aria-label="Offline"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 xl:px-3"
            >
              <WifiOff size={14} aria-hidden="true" /> <span className="hidden xl:inline">Offline</span>
            </span>
          )}
          <button
            type="button"
            onClick={onRandomize}
            aria-label="What's next?"
            title="Pick something to watch, read or play next"
            className="tactile hidden h-10 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-accent-500 to-accent2-600 px-2.5 text-sm font-semibold text-white hover:brightness-110 md:inline-flex xl:px-4"
          >
            <Dices size={18} aria-hidden="true" /> <span className="hidden xl:inline">What's next?</span>
          </button>
          <button
            type="button"
            onClick={onRadar}
            aria-label="Release Radar"
            aria-pressed={radarOpen}
            title="Upcoming releases and news for your titles"
            className={cn(
              'tactile grid size-10 shrink-0 place-items-center rounded-xl border',
              radarOpen ? 'border-white bg-white text-zinc-950' : 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white',
            )}
          >
            <Radar size={19} />
          </button>
          <button
            type="button"
            onClick={onAdd}
            aria-label="Add entry"
            title="Add a game, book, movie or anything else"
            className="tactile grid size-10 shrink-0 place-items-center rounded-xl border border-accent-400/30 bg-accent-400/10 text-accent-200 hover:bg-accent-400/20 hover:text-white"
          >
            <Plus size={20} />
          </button>
          <button
            type="button"
            onClick={onSettings}
            aria-label="Settings, backup and sync"
            className="tactile grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
          >
            <Settings size={19} />
          </button>
          {signedIn ? (
            <button
              type="button"
              onClick={onAccount}
              aria-label={`Account: ${cloud.user.email || 'signed in'}`}
              title={cloud.user.email || 'Account'}
              className="tactile grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-linear-to-br from-accent-500 to-accent2-600 text-sm font-bold uppercase text-white ring-2 ring-white/15 hover:ring-accent-300/60"
            >
              {cloud.user.photoURL ? (
                <img src={cloud.user.photoURL} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
              ) : (
                (cloud.user.displayName || cloud.user.email || '?').charAt(0)
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onAccount}
              className="tactile signin-btn inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-sm font-bold text-zinc-950 sm:px-4"
            >
              <LogIn size={17} strokeWidth={2.5} aria-hidden="true" />
              <span className="sm:hidden">Sign in</span>
              <span className="hidden sm:inline">Sign in / Sign up</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
