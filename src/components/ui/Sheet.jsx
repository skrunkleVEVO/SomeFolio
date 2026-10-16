import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';

const CLOSE_MS = 220;

/**
 * Bottom-sheet drawer on mobile (drag the handle down to dismiss),
 * centered modal from the `md` breakpoint up.
 * `children` may be a function receiving `{ close }` for animated closing.
 */
export default function Sheet({ open, onClose, label, children, className }) {
  const [closing, setClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const close = useCallback(() => setClosing(true), []);

  useEffect(() => {
    if (open) {
      setClosing(false);
      setDragY(0);
    }
  }, [open]);

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => {
      setClosing(false);
      onCloseRef.current();
    }, CLOSE_MS);
    return () => clearTimeout(timer);
  }, [closing]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, close]);

  if (!open) return null;

  const onPointerDown = (e) => {
    dragStart.current = { y: e.clientY, t: performance.now() };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (dragStart.current) setDragY(Math.max(0, e.clientY - dragStart.current.y));
  };
  const onPointerUp = (e) => {
    if (!dragStart.current) return;
    const dy = e.clientY - dragStart.current.y;
    const velocity = dy / (performance.now() - dragStart.current.t);
    dragStart.current = null;
    setDragging(false);
    if (dy > 120 || velocity > 0.6) close();
    else setDragY(0);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <div
        aria-hidden="true"
        onClick={close}
        className={cn('absolute inset-0 bg-black/70 backdrop-blur-sm', closing ? 'animate-fade-out' : 'animate-fade-in')}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-zinc-950 shadow-2xl shadow-black outline-none',
          'md:max-h-[88vh] md:max-w-2xl md:rounded-3xl',
          closing ? 'animate-sheet-down md:animate-pop-out' : 'animate-sheet-up md:animate-pop-in',
          !dragging && 'transition-transform duration-300',
          className,
        )}
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="absolute inset-x-0 top-0 z-20 flex h-8 cursor-grab touch-none justify-center pt-2.5 md:hidden"
        >
          <span className="h-1.5 w-11 rounded-full bg-white/40 shadow" />
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain pb-[max(env(safe-area-inset-bottom),1rem)]">
          {typeof children === 'function' ? children({ close }) : children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
