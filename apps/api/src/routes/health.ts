import { Hono } from 'hono';

export const health = new Hono().get('/', (c) =>
  c.json({ ok: true, service: 'api', at: new Date().toISOString() }),
);
