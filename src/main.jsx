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

