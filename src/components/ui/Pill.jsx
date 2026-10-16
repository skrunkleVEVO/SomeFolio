import { cn } from '../../lib/cn';

const TONES = {
  vibe: {
    on: 'border-transparent bg-linear-to-r from-accent-500 to-accent2-500 text-white shadow-lg shadow-accent-500/25',
    off: 'border-accent-400/25 bg-accent-400/5 text-accent-200 hover:bg-accent-400/15',
  },
  genre: {
    on: 'border-transparent bg-white text-zinc-950',
    off: 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10',
  },
};

export default function Pill({ active = false, tone = 'genre', className, children, ...props }) {
  const styles = TONES[tone] || TONES.genre;
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-95',
        active ? styles.on : styles.off,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
