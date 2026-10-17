import { createContext, useCallback, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const toast = useCallback(
    // `action` is one `{ label, onClick }` button, or an array of them.
    (message, { action, duration = 3200 } = {}) => {
      const id = Math.random().toString(36).slice(2);
      const persistent = !Number.isFinite(duration); // `duration: Infinity` stays until dismissed
      const actions = [action].flat().filter(Boolean);
      setToasts((list) => [...list.slice(-2), { id, message, actions, persistent }]);
      if (!persistent) setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+6rem)] md:pb-8">
          {toasts.map((t) => (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex animate-toast items-center gap-4 rounded-2xl border border-white/10 bg-zinc-900/95 px-4 py-3 text-sm text-zinc-100 shadow-2xl shadow-black/50 backdrop-blur"
            >
              <span>{t.message}</span>
              {t.actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => {
                    action.onClick();
                    dismiss(t.id);
                  }}
                  className="font-semibold text-accent-300 hover:text-accent-200"
                >
                  {action.label}
                </button>
              ))}
              {t.persistent && (
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss"
                  className="-mr-1 grid size-6 place-items-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
