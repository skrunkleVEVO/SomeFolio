import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { LibraryProvider } from './context/LibraryContext';
import { ToastProvider } from './context/ToastContext';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <LibraryProvider>
        <App />
      </LibraryProvider>
    </ToastProvider>
  </StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Service worker failed', err));
  });
}
