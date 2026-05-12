import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';   // Tailwind base + shadcn CSS variables
import App from './App';

// React 18 root API — StrictMode double-invokes effects in dev to catch side effects
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
