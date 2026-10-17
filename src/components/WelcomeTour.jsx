import { useState } from 'react';
import { ArrowLeft, ArrowRight, BookMarked, ChevronDown, Dices, Gamepad2, Heart, Plus, Search, Settings, Star, X } from 'lucide-react';
import Sheet from './ui/Sheet';
import { CATEGORIES } from '../lib/categories';
import { cn } from '../lib/cn';

const STEPS = [
  {
    title: 'Welcome to SomeFolio',
    body: 'One shelf for everything you watch, read and play: anime, manga, games, movies, TV, books, and anything else you want to keep track of.',
    art: CategoriesArt,
  },
  {
    title: 'Search to add',
    body: 'Pick a category on the left of the search bar, type a title and tap a result. Covers, episode or chapter counts and synopses fill in on their own.',
    art: SearchArt,
  },
  {
    title: 'Track as you go',
    body: 'Set a status, tap +1 on a card after each episode, chapter or session, then rate it and tag it with vibes when you finish.',
    art: TrackArt,
  },
  {
    title: "Can't decide what's next?",
    body: "The dice picks something from your list. Open Settings to sync across devices, back up your library or change the colours.",
    art: NextArt,
  },
];

/** A short walkthrough shown on a first visit; it can be replayed from Settings. */
export default function WelcomeTour({ open, onClose, onStart }) {
  return (
    <Sheet open={open} onClose={onClose} label="Welcome tour">
      {({ close }) => <Tour close={close} onStart={onStart} />}
    </Sheet>
  );
}

function Tour({ close, onStart }) {
  const [step, setStep] = useState(0);
  const { title, body, art: Art } = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="relative px-5 pb-4 pt-8 md:px-7 md:pt-7">
      <button
        type="button"
        onClick={close}
        aria-label="Skip tour"
        className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/5 text-zinc-300 hover:bg-white/10"
      >
        <X size={18} />
      </button>

      <div key={step} className="animate-pop-in">
        <div className="grid h-44 place-items-center rounded-2xl border border-white/10 bg-linear-to-br from-accent-500/10 via-zinc-900 to-accent2-600/15 p-4">
          <Art />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-accent-300">
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 className="mt-1 text-xl font-extrabold tracking-tight">{title}</h2>
        <p className="mt-2 min-h-[4.5rem] text-sm leading-relaxed text-zinc-400">{body}</p>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <div className="flex flex-1 gap-1.5" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span key={s.title} className={cn('h-1.5 rounded-full transition-all', i === step ? 'w-6 bg-accent-400' : 'w-1.5 bg-white/20')} />
          ))}
        </div>
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            aria-label="Previous step"
            className="grid size-11 place-items-center rounded-xl bg-white/5 text-zinc-300 transition hover:bg-white/10"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (!last) return setStep((s) => s + 1);
            close();
            onStart();
          }}
          className="flex h-11 items-center gap-2 rounded-xl bg-linear-to-r from-accent-500 to-accent2-600 px-5 text-sm font-bold text-white shadow-lg shadow-accent-500/25 transition hover:brightness-110 active:scale-95"
        >
          {last ? (
            <>
              <Search size={17} /> Start searching
            </>
          ) : (
            <>
              Next <ArrowRight size={17} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ---------- illustrations: small mock-ups of the real controls ---------- */

function CategoriesArt() {
  return (
    <div className="flex flex-col items-center gap-4">
      <span className="grid size-14 place-items-center rounded-2xl bg-linear-to-br from-accent-500 to-accent2-600 shadow-lg shadow-accent-500/30">
        <BookMarked size={26} className="text-white" />
      </span>
      <div className="flex flex-wrap justify-center gap-1.5">
        {CATEGORIES.map(({ id, label, icon: Icon }) => (
          <span key={id} className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-zinc-200">
            <Icon size={12} className="text-accent-300" /> {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function SearchArt() {
  return (
    <div className="w-full max-w-xs space-y-2">
      <div className="flex items-center rounded-xl border border-accent-400/50 bg-white/5 text-sm ring-4 ring-accent-500/10">
        <span className="flex items-center gap-1 border-r border-white/10 px-2.5 py-2 font-semibold text-zinc-100">
          <Gamepad2 size={14} className="text-accent-200" /> Games <ChevronDown size={12} className="text-zinc-400" />
        </span>
        <span className="flex items-center gap-2 px-2.5 text-zinc-200">
          <Search size={14} className="text-zinc-500" /> hollow kn<span className="h-4 w-px animate-pulse bg-zinc-200" />
        </span>
      </div>
      <div className="flex items-center gap-2.5 rounded-xl bg-zinc-900/90 p-2 ring-1 ring-white/10">
        <span className="h-10 w-7 rounded bg-linear-to-br from-accent-400/60 to-accent2-600/60" />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-zinc-100">Hollow Knight</span>
          <span className="block text-[11px] text-zinc-500">2017 · Team Cherry</span>
        </span>
        <span className="rounded-full bg-accent-400/20 px-2 py-0.5 text-[10px] font-bold text-accent-200">Tap to add</span>
      </div>
    </div>
  );
}

function TrackArt() {
  return (
    <div className="flex items-end gap-4">
      <div className="relative w-24 overflow-hidden rounded-xl bg-linear-to-br from-accent-500/50 to-accent2-600/60 ring-1 ring-white/15">
        <div className="aspect-[2/3]" />
        <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">Ep 4/12</span>
        <span className="absolute bottom-1.5 right-1.5 grid size-7 place-items-center rounded-lg bg-white text-zinc-950 shadow">
          <Plus size={16} strokeWidth={3} />
        </span>
      </div>
      <div className="space-y-2 pb-1">
        <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-zinc-200">
          <span className="size-2 rounded-full bg-emerald-400" /> Watching
        </span>
        <span className="flex gap-0.5 text-amber-300">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} size={14} className={i < 4 ? 'fill-amber-300' : ''} />
          ))}
        </span>
        <span className="flex items-center gap-1 text-xs text-rose-300">
          <Heart size={13} className="fill-rose-500" /> Favorite
        </span>
      </div>
    </div>
  );
}

function NextArt() {
  return (
    <div className="flex items-center gap-4">
      <span className="grid size-16 place-items-center rounded-2xl bg-linear-to-br from-accent-500 to-accent2-600 text-white shadow-xl shadow-accent-500/40">
        <Dices size={30} />
      </span>
      <span className="grid size-12 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-300">
        <Settings size={22} />
      </span>
    </div>
  );
}
