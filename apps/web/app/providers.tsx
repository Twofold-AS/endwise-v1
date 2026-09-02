'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink, splitLink } from '@trpc/client';
import { type ReactNode, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { erChromeTrpcPath } from '@/lib/trpc-chrome';

function sameOriginBatch() {
  return httpBatchLink({
    url: '/trpc',
    fetch: (url, options) => fetch(url, { ...options, credentials: 'include' }),
  });
}

/**
 * F1 / F13-03 — tRPC + React Query-provider. `/trpc` er en Next route handler
 * (same-origin). `credentials: 'include'` sender sesjonscookien med.
 * To batchere: chrome (`session.me`, kort, helpdesk, billing) lander uten å
 * vente på lager/kunder/jobber. httpBatchLink er all-or-nothing per request.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        splitLink({
          condition: (op) => erChromeTrpcPath(op.path),
          true: sameOriginBatch(),
          false: sameOriginBatch(),
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
