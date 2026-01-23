/**
 * Graphix UI Entry Point
 *
 * Initializes React, TanStack Router, and TanStack Query.
 */

import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { DevtoolsToggle } from './components/DevtoolsToggle';

// Import the generated route tree
import { routeTree } from './routeTree.gen';

// Create a new router instance
const router = createRouter({ 
  routeTree,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
});

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// Create a QueryClient for TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Remove loading spinner
const loadingEl = document.getElementById('loading');
if (loadingEl) {
  loadingEl.style.opacity = '0';
  loadingEl.style.transition = 'opacity 0.3s ease';
  setTimeout(() => loadingEl.remove(), 300);
}

// Mount the app
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {import.meta.env.DEV && (
        <DevtoolsToggle>
          {(visible) => visible ? <ReactQueryDevtools initialIsOpen={false} position="bottom" /> : null}
        </DevtoolsToggle>
      )}
    </QueryClientProvider>
  </StrictMode>
);
