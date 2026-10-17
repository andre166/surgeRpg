import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './ui/App.jsx';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import '@fontsource/pixelify-sans/700.css';
import './ui/styles.css';

createRoot(document.getElementById('root')).render(<App />);

// Dev/test hook: exposes the store for smoke tests (never in production builds).
if (import.meta.env.DEV) {
  import('./ui/stores/gameStore.js').then((m) => {
    window.__surge = m.useGame;
  });
}
