'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { type ReactNode, useState } from 'react';
import { trpc } from '@/lib/trpc';

/**
 * F1 / F13-03 — tRPC + React Query-provider. `/trpc` er en Next route handler
 * (same-origin). `credentials: 'include'` sender sesjonscookien med.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/trpc',
          fetch: (url, options) => fetch(url, { ...options, credentials: 'include' }),
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
