'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink, httpLink, splitLink } from '@trpc/client';
import { type ReactNode, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { erChromeTrpcPath, erSessionMePath } from '@/lib/trpc-chrome';

function sameOriginFetch(url: RequestInfo | URL, options?: RequestInit) {
  return fetch(url, { ...options, credentials: 'include' });
}

function sameOriginBatch() {
  return httpBatchLink({
    url: '/trpc',
    fetch: sameOriginFetch,
  });
}

/**
 * F1 / F13-03 — tRPC + React Query-provider. `/trpc` er en Next route handler
 * (same-origin). `credentials: 'include'` sender sesjonscookien med.
 *
 * Tre lenker, med vilje: `httpBatchLink` er all-or-nothing per HTTP-request.
 * `session.me` alene (httpLink) — nav trenger bare den.
 * Chrome-batch (kort / helpdesk / billing) — ikke lager/kunder/jobber.
 * Side-batch — resten. Hver HTTP-request kjører `createRequestContext`
 * (getSession); derfor er chrome-settet lite, ikke «to store batcher».
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        splitLink({
          condition: (op) => erSessionMePath(op.path),
          true: httpLink({
            url: '/trpc',
            fetch: sameOriginFetch,
          }),
          false: splitLink({
            condition: (op) => erChromeTrpcPath(op.path),
            true: sameOriginBatch(),
            false: sameOriginBatch(),
          }),
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
