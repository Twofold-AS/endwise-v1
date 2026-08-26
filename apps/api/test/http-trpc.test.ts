import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/context.ts', () => ({
  createRequestContext: vi.fn(async () => ({
    db: {},
    events: { publish: () => undefined },
    tenantId: null,
    userId: null,
    role: null,
  })),
}));

import { handleTrpc } from '../src/http/trpc.ts';

/**
 * Trpc over Web Request, uten Hono og uten DB.
 * `health` er publicProcedure og trenger ikke sesjon.
 */
describe('handleTrpc', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('svarer på public health-prosedyren', async () => {
    const req = new Request('http://endwise.test/trpc/health', { method: 'GET' });
    const res = await handleTrpc(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { result?: { data?: { ok?: boolean } } };
    expect(body.result?.data?.ok).toBe(true);
  });
});
