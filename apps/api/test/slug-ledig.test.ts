import { beforeEach, describe, expect, it, vi } from 'vitest';

const execute = vi.fn();

vi.mock('@endwise/modules/tenant-host', async (orig) => {
  const mod = await orig();
  return {
    ...mod,
    erWhiteLabelAktiv: vi.fn(() => true),
  };
});

import { nullstillSlugSjekkTeller } from '@endwise/modules/slug';
import { erWhiteLabelAktiv } from '@endwise/modules/tenant-host';
import { krevWhiteLabel, svarSlugLedig } from '../src/trpc/slug-ledig.ts';

describe('tenants.slugLedig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nullstillSlugSjekkTeller();
    vi.mocked(erWhiteLabelAktiv).mockReturnValue(true);
  });

  it('krevWhiteLabel er no-op (white label er alltid på)', () => {
    expect(() => krevWhiteLabel()).not.toThrow();
  });

  it('samme feil for ukjent invitasjon', async () => {
    execute.mockResolvedValue({ rows: [] });
    const ctx = { db: { execute } } as never;
    await expect(
      svarSlugLedig(ctx, { slug: 'bergen', token: 'ukjent' }, false),
    ).rejects.toMatchObject({ message: 'Ugyldig invitasjon' });
  });

  it('reservert ord uten DB-kall på slug_ledig', async () => {
    execute.mockResolvedValue({ rows: [{ id: 'inv-1', kind: 'owner' }] });
    const ctx = { db: { execute } } as never;
    const svar = await svarSlugLedig(ctx, { slug: 'platform', token: 'tok' }, false);
    expect(svar.grunn).toBe('reservert');
    expect(svar.ledig).toBe(false);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('ledig når SQL sier ledig', async () => {
    execute
      .mockResolvedValueOnce({ rows: [{ id: 'inv-1', kind: 'owner' }] })
      .mockResolvedValueOnce({ rows: [{ ledig: true }] });
    const ctx = { db: { execute } } as never;
    const svar = await svarSlugLedig(ctx, { slug: 'bergen', token: 'tok' }, false);
    expect(svar).toMatchObject({ ledig: true, grunn: 'ledig', slug: 'bergen' });
  });

  it('opptatt gir forslag, ikke eier', async () => {
    execute
      .mockResolvedValueOnce({ rows: [{ id: 'inv-1', kind: 'owner' }] })
      .mockResolvedValueOnce({ rows: [{ ledig: false }] });
    const ctx = { db: { execute } } as never;
    const svar = await svarSlugLedig(
      ctx,
      { slug: 'bergen', token: 'tok', firmanavn: 'Nordvik' },
      false,
    );
    expect(svar.ledig).toBe(false);
    expect(svar.grunn).toBe('opptatt');
    expect(svar.forslag).toContain('bergen-nordvik');
    expect(JSON.stringify(svar)).not.toMatch(/eier/i);
  });

  it('reserverSlug: to holdere — andre taper', async () => {
    execute
      .mockResolvedValueOnce({ rows: [{ id: 'inv-1', kind: 'owner' }] })
      .mockResolvedValueOnce({ rows: [{ ok: true }] })
      .mockResolvedValueOnce({ rows: [{ id: 'inv-2', kind: 'owner' }] })
      .mockResolvedValueOnce({ rows: [{ ok: false }] });
    const ctx = { db: { execute } } as never;
    const a = await svarSlugLedig(ctx, { slug: 'bergen', token: 'a' }, true);
    const b = await svarSlugLedig(ctx, { slug: 'bergen', token: 'b' }, true);
    expect(a.ledig).toBe(true);
    expect(b.ledig).toBe(false);
    expect(b.forslag.length).toBeGreaterThan(0);
  });
});
