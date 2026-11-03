import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { appRouter } from '../src/trpc/router.ts';

async function forventer(kall: Promise<unknown>, code: 'FORBIDDEN' | 'PRECONDITION_FAILED') {
  await expect(kall).rejects.toMatchObject({ code });
}

const fakeCtx = (role: 'endwise_admin' | 'dealer_admin' | 'dealer_staff') =>
  ({
    db: {} as never,
    events: { publish: async () => {} } as never,
    tenantId: '00000000-0000-0000-0000-000000000001',
    userId: `til-fake-${role}`,
    role,
  }) as never;

describe('F23 / white label F6a: tillatelse-porter', () => {
  it('uten flagg er tillatelse stengt, staff får ikke liste', async () => {
    await forventer(
      appRouter.createCaller(fakeCtx('dealer_admin')).tillatelse.liste(),
      'PRECONDITION_FAILED',
    );
    await forventer(
      appRouter.createCaller(fakeCtx('dealer_staff')).tillatelse.sett({
        userId: 'annen',
        omrade: 'bookinger',
        niva: 'se',
      }),
      'FORBIDDEN',
    );
  });

  it('kilde: omrade fra kode, FOR UPDATE, én dealer_admin, ikke egne', () => {
    const her = dirname(fileURLToPath(import.meta.url));
    const init = readFileSync(resolve(her, '../src/trpc/init.ts'), 'utf8');
    const router = readFileSync(resolve(her, '../src/trpc/routers/tillatelse.ts'), 'utf8');
    const sql = readFileSync(
      resolve(her, '../../../packages/db/drizzle/0050_white_label_f6a.sql'),
      'utf8',
    );
    expect(init).toMatch(/omradeProcedure/);
    expect(init).toMatch(/Spør daglig leder/);
    expect(init).not.toMatch(/input\.omrade/);
    expect(router).toMatch(/vurderTildeling/);
    expect(router).toMatch(/tildel_tillatelse/);
    expect(sql).toMatch(/FOR UPDATE/);
    expect(sql).toMatch(/sjekk_en_dealer_admin/);
    expect(sql).toMatch(/member_user_org_uidx/);
    expect(sql).toMatch(/rapport_flere_dealer_admin/);
    expect(sql).toMatch(/p_aktor = p_mal/);
    expect(sql).not.toMatch(/p_aktor_rolle/);
  });
});
