import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));
function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('0055 white-label F11b-kontrakt', () => {
  const sql = les('../drizzle/0055_white_label_f11b.sql');
  const rls = les('../src/rls.ts');
  const schema = les('../src/schema/messages.ts');

  it('journal har 0055 etter 0054', () => {
    const journal = les('../drizzle/meta/_journal.json');
    expect(journal).toMatch(/0055_white_label_f11b/);
    expect(journal.indexOf('0054_white_label_f10')).toBeLessThan(
      journal.indexOf('0055_white_label_f11b'),
    );
  });

  it('tråd har customer_id og RESTRICTIVE kunde-RLS', () => {
    expect(sql).toMatch(/ALTER TABLE "threads" ADD COLUMN IF NOT EXISTS "customer_id"/);
    expect(sql).toMatch(/threads_customer_own/);
    expect(sql).toMatch(/messages_customer_own/);
    expect(sql).toMatch(/thread_participants_customer_own/);
    expect(rls).toMatch(/customerRestrictiveViaThread/);
    expect(schema).toMatch(/customerId: uuid\('customer_id'\)/);
    expect(schema).toMatch(/customerRestrictivePolicy\('threads'/);
    expect(schema).toMatch(/customerRestrictiveViaThread\('messages'/);
  });
});
