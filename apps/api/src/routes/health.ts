import { Hono } from 'hono';
import { handleHealth } from '../http/health.ts';

export const health = new Hono().get('/', () => handleHealth());
