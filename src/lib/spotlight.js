/**
 * Pointer handler for the `spotlight` utility (index.css): writes the cursor
 * position into CSS variables on the element, so the radial border highlight
 * follows the mouse without re-rendering React.
 */
export function spotlightMove(event) {
  if (event.pointerType !== 'mouse') return;
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${event.clientX - rect.left}px`);
  el.style.setProperty('--my', `${event.clientY - rect.top}px`);
}
