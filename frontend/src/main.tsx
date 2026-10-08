
import { installStaleChunkRecovery } from './lib/recoverFromStaleChunks';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import 'leaflet/dist/leaflet.css';
import './index.css';

// A tab left open across a deploy holds an index.html whose chunk names no
// longer exist on the server; this reloads it once instead of showing the
// user a dead error screen.
installStaleChunkRecovery();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
 
