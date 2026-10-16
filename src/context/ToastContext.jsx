import { createContext, useCallback, useContext, useState } from 'react';
import { createPortal } from 'react-dom';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const toast = useCallback(
    (message, { action, duration = 3200 } = {}) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((list) => [...list.slice(-2), { id, message, action }]);
      setTimeout(() => dismiss(id), duration);
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
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action.onClick();
                    dismiss(t.id);
                  }}
                  className="font-semibold text-accent-300 hover:text-accent-200"
                >
                  {t.action.label}
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
