import { createDb, type Database } from '@endwise/db';
import { createEventBus, type EventBus } from '@endwise/events';

export interface AppContext {
  db: Database;
  events: EventBus;
  /** Settes av auth-middleware i F1. Null = uautentisert. */
  tenantId: string | null;
  userId: string | null;
}

let dbSingleton: Database | undefined;

function getDb(): Database {
  if (!dbSingleton) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL mangler');
    dbSingleton = createDb(url);
  }
  return dbSingleton;
}

const events = createEventBus();

export function createAppContext(): AppContext {
  return { db: getDb(), events, tenantId: null, userId: null };
}
