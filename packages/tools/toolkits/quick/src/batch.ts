import { z } from 'zod';

/**
 * Bekreftet batch-form (Yamaha customer/batch, ~20466 rader):
 * `{ totalCount, limit, offset, results: [...] }`.
 * Samme form brukes for item/batch og stockentry/batch (GET-only).
 */
export const quickBatchPage = z
  .object({
    totalCount: z.number(),
    limit: z.number(),
    offset: z.number(),
    results: z.array(z.unknown()),
  })
  .loose();

export type QuickBatchPage = z.infer<typeof quickBatchPage>;

/**
 * Neste offset: `offset += results.length` til `offset >= totalCount`.
 * Tom side eller ferdig → `null` (stopp). Aldri bruk `limit` som steg når
 * siste side er kortere.
 */
export function nextBatchOffset(page: {
  totalCount: number;
  offset: number;
  results: { length: number };
}): number | null {
  if (page.results.length === 0) return null;
  const next = page.offset + page.results.length;
  if (next >= page.totalCount) return null;
  return next;
}
