import { useState } from 'react';
import { getCategory } from '../../lib/categories';
import { cn } from '../../lib/cn';

/**
 * An entry's cover, or a themed placeholder (accent gradient + category icon)
 * when there is no cover URL or the image fails to load. Sizing comes from
 * `className`, so it drops into posters, thumbnails and backdrops alike.
 */
export default function CoverArt({ entry, className, alt = '', iconSize = 28, eager = false }) {
  const [failed, setFailed] = useState(null);
  const src = entry.coverUrl;

  if (!src || failed === src) {
    const Icon = getCategory(entry.category).icon;
    return (
      <div
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className={cn('grid place-items-center bg-zinc-900 bg-linear-to-br from-accent-500/25 via-zinc-900 to-accent2-600/30', className)}
      >
        <Icon size={iconSize} strokeWidth={1.5} className="text-accent-200/60" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? undefined : 'lazy'}
      decoding="async"
      onError={() => setFailed(src)}
      className={cn('bg-zinc-800 object-cover', className)}
      style={entry.metadata?.color ? { backgroundColor: entry.metadata.color } : undefined}
    />
  );
}
