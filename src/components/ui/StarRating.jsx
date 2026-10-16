import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../lib/cn';

/** Five stars with half-star precision, stored as a 1–10 score (0 = unrated). */
export default function StarRating({ value = 0, onChange, size = 30 }) {
  const [hover, setHover] = useState(null);
  const shown = hover ?? value;

  return (
    <div className="flex items-center gap-3">
      <div role="radiogroup" aria-label="Your rating" className="flex gap-0.5" onPointerLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((i) => {
          const fill = shown >= i * 2 ? 100 : shown >= i * 2 - 1 ? 50 : 0;
          return (
            <span key={i} className="relative block" style={{ width: size, height: size }}>
              <Star size={size} strokeWidth={0} fill="currentColor" className="absolute inset-0 text-zinc-800" />
              <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill}%` }}>
                <Star size={size} strokeWidth={0} fill="currentColor" className="text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.45)]" />
              </span>
              {[i * 2 - 1, i * 2].map((score, half) => (
                <button
                  key={score}
                  type="button"
                  role="radio"
                  aria-checked={value === score}
                  aria-label={`${score} out of 10`}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(score)}
                  onClick={() => onChange(value === score ? 0 : score)}
                  className={cn('absolute inset-y-0 w-1/2 rounded-sm focus-visible:outline-2 focus-visible:outline-amber-300', half ? 'right-0' : 'left-0')}
                />
              ))}
            </span>
          );
        })}
      </div>
      <span className="text-sm font-semibold tabular-nums text-zinc-300">{shown ? `${shown}/10` : 'Not rated'}</span>
    </div>
  );
}
