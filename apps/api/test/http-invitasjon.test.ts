import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const stubs = vi.hoisted(() => ({
  finnApen: vi.fn(),
  forbruk: vi.fn(),
}));

vi.mock('../src/context.ts', () => ({
  createAppContext: () => ({ db: {} }),
}));

vi.mock('@endwise/modules/invitasjoner', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@endwise/modules/invitasjoner')>();
  return {
    ...actual,
    createInvitasjonsmodul: () => ({
      finnApen: stubs.finnApen,
      forbruk: stubs.forbruk,
    }),
  };
});

import { handleHono } from '../src/http/hono.ts';

/**
 * F1-10 / F13-03 — siden henter `GET /invitasjoner/:token` (flertall).
 * Et mount-miss (Hono default 404) har ikke `gyldig`/`grunn`. Et ekte miss
 * fra `lookup_open_invitation` har det. Produksjon på Scaleway så ut som
 * det første inntil vi sjekket kroppen: ruta traff, oppslaget ga null.
 */
const HONO_MISS = {
  gyldig: false,
  grunn: 'Invitasjonen er ugyldig, brukt eller utløpt.',
} as const;

const her = dirname(fileURLToPath(import.meta.url));

describe('handleHono /invitasjoner (F1-10 side-sti)', () => {
  beforeEach(() => {
    stubs.finnApen.mockReset();
    stubs.forbruk.mockReset();
  });

  it('GET samme sti som siden bruker gir Hono-miss-kroppen, ikke mount-miss', async () => {
    stubs.finnApen.mockResolvedValue(null);
    const res = await handleHono(new Request('http://endwise.test/invitasjoner/ukjent-token'));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual(HONO_MISS);
    expect(stubs.finnApen).toHaveBeenCalledWith('ukjent-token');
  });

  it('POST /invitasjoner/godta treffer godta, ikke mount-miss', async () => {
    stubs.finnApen.mockResolvedValue(null);
    const res = await handleHono(
      new Request('http://endwise.test/invitasjoner/godta', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: 'ukjent-token-xx', navn: 'Kari Nordmann' }),
      }),
    );
    expect(res.status).toBe(410);
    expect(await res.json()).toEqual({
      error: 'Invitasjonen er ugyldig, brukt eller utløpt.',
    });
    expect(stubs.finnApen).toHaveBeenCalledWith('ukjent-token-xx');
  });

  it('GET /invitasjon/:token (entall) er mount-miss — den stien er siden', async () => {
    const res = await handleHono(new Request('http://endwise.test/invitasjon/ukjent-token'));
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('404 Not Found');
    expect(stubs.finnApen).not.toHaveBeenCalled();
  });
});

describe('FORCE RLS-unntaket for invitasjonsoppslag', () => {
  it('funksjonene setter app.invitation_hash før de leser invitations', () => {
    const sql = readFileSync(resolve(her, '../../../packages/db/sql/functions.sql'), 'utf8');
    expect(sql).toMatch(/set_config\('app\.invitation_hash'/);
    expect(sql).toMatch(/lookup_open_invitation/);
    expect(sql).toMatch(/consume_invitation/);
  });

  it('grants.sql har den smale hash-policyen (samme mønster som platform_admin)', () => {
    const sql = readFileSync(resolve(her, '../../../packages/db/sql/grants.sql'), 'utf8');
    expect(sql).toMatch(/invitations_open_by_hash/);
    expect(sql).toMatch(/app\.invitation_hash/);
  });
});
