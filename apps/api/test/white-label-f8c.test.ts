import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

describe('F29 / white label F8c: overføring av daglig leder', () => {
  it('SQL bytter gammel til staff først, sletter sesjoner, FOR UPDATE', () => {
    const sql = readFileSync(
      resolve(her, '../../../packages/db/drizzle/0053_white_label_f8c.sql'),
      'utf8',
    );
    expect(sql).toMatch(/overfor_daglig_leder_rev=0053/);
    expect(sql).toMatch(/FOR UPDATE/);
    expect(sql.indexOf("role = 'dealer_staff'")).toBeLessThan(sql.lastIndexOf("role = 'dealer_admin'"));
    expect(sql).toMatch(/DELETE FROM session WHERE user_id = p_fra/);
    expect(sql).toMatch(/stedfortreder/);
  });

  it('ruter krever TOTP på frivillig og to admin på nød', () => {
    const rute = readFileSync(resolve(her, '../src/trpc/routers/eier.ts'), 'utf8');
    expect(rute).toMatch(/verifiserFerskTotpForBruker/);
    expect(rute).toMatch(/overfor_daglig_leder/);
    expect(rute).toMatch(/OWNER_TRANSFER_AUDIT/);
    expect(rute).toMatch(/kanStarteNod/);
    expect(rute).toMatch(/nesteNodGodkjenning/);
    expect(rute).toMatch(/kanUtforeNod/);
    expect(rute).not.toMatch(/#0066ff/);
  });
});
