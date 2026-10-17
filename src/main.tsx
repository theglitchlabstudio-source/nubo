import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { queryClient } from '@/data/hooks';
import { App } from '@/app/App';
import { Toaster } from '@/ui/Toast';
import '@/styles/index.css';

// GitHub Pages: 404.html is a copy of index.html, so deep links land here with the right path.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <BrowserRouter basename={basename}>
          <App />
          <Toaster />
        </BrowserRouter>
      </MotionConfig>
    </QueryClientProvider>
  </StrictMode>,
);
