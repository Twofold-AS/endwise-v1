import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

import { INVITASJON_SAMME_FEIL } from '@endwise/modules/invitasjon-kode';
import { handleHono } from '../src/http/hono.ts';

const her = dirname(fileURLToPath(import.meta.url));
const FLAG = 'ENDWISE_WHITE_LABEL';
const CSRF = { 'x-endwise-csrf': '1', 'content-type': 'application/json' };

const apen = {
  id: '11111111-1111-4111-8111-111111111111',
  tenantId: '22222222-2222-4222-8222-222222222222',
  epost: 'eier@verksted.test',
  funksjon: 'leder',
  kind: 'owner' as const,
  rolle: 'dealer_admin',
  utloper: new Date('2026-11-10T12:00:00.000Z'),
};

describe('F27 / white label F8a: send-kode og godta', () => {
  const forrige = process.env[FLAG];

  beforeEach(() => {
    stubs.finnApen.mockReset();
    stubs.forbruk.mockReset();
    process.env[FLAG] = '1';
  });

  afterEach(() => {
    if (forrige === undefined) delete process.env[FLAG];
    else process.env[FLAG] = forrige;
  });

  it('GET endrer ingenting og røper kreverKode', async () => {
    stubs.finnApen.mockResolvedValue(null);
    const res = await handleHono(new Request('http://endwise.test/invitasjoner/ukjent-token-xx'));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      gyldig: false,
      grunn: INVITASJON_SAMME_FEIL,
    });
  });

  it('POST send-kode er alltid 200 — også uten CSRF og uten treff', async () => {
    stubs.finnApen.mockResolvedValue(null);
    const uten = await handleHono(
      new Request('http://endwise.test/invitasjoner/ukjent-token-xx/send-kode', {
        method: 'POST',
      }),
    );
    expect(uten.status).toBe(200);
    expect(await uten.json()).toEqual({ ok: true });

    stubs.finnApen.mockResolvedValue(apen);
    const med = await handleHono(
      new Request('http://endwise.test/invitasjoner/ekte-token-xx/send-kode', {
        method: 'POST',
        headers: CSRF,
      }),
    );
    expect(med.status).toBe(200);
    expect(await med.json()).toEqual({ ok: true });
  });

  it('godta uten CSRF eller kode gir samme feil, forbruk kalles ikke', async () => {
    stubs.finnApen.mockResolvedValue(apen);
    const utenCsrf = await handleHono(
      new Request('http://endwise.test/invitasjoner/godta', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: 'ekte-token-xx', navn: 'Kari Nordmann', kode: 'ABCD2345' }),
      }),
    );
    expect(utenCsrf.status).toBe(410);
    expect(await utenCsrf.json()).toEqual({ error: INVITASJON_SAMME_FEIL });

    const utenKode = await handleHono(
      new Request('http://endwise.test/invitasjoner/godta', {
        method: 'POST',
        headers: CSRF,
        body: JSON.stringify({ token: 'ekte-token-xx', navn: 'Kari Nordmann' }),
      }),
    );
    expect(utenKode.status).toBe(410);
    expect(await utenKode.json()).toEqual({ error: INVITASJON_SAMME_FEIL });
    expect(stubs.forbruk).not.toHaveBeenCalled();
  });

  it('to samtidige godta mot samme token gir samme feil (ingen enumerering)', async () => {
    stubs.finnApen.mockResolvedValue(null);
    const kropp = {
      token: 'samtidig-token-xx',
      navn: 'Kari Nordmann',
      kode: 'ABCD2345',
    };
    const kall = () =>
      handleHono(
        new Request('http://endwise.test/invitasjoner/godta', {
          method: 'POST',
          headers: CSRF,
          body: JSON.stringify(kropp),
        }),
      );
    const [a, b] = await Promise.all([kall(), kall()]);
    expect(a.status).toBe(410);
    expect(b.status).toBe(410);
    expect(await a.json()).toEqual({ error: INVITASJON_SAMME_FEIL });
    expect(await b.json()).toEqual({ error: INVITASJON_SAMME_FEIL });
    expect(stubs.forbruk).not.toHaveBeenCalled();
  });

  it('to samtidige forsøk: FOR UPDATE og consume i samme transaksjon, samme feil', () => {
    const rute = readFileSync(resolve(her, '../src/routes/invitasjon.ts'), 'utf8');
    expect(rute).toMatch(/for update/i);
    expect(rute).toMatch(/brukInvitasjonskode/);
    expect(rute).toMatch(/modul\.forbruk/);
    expect(rute).toMatch(/INVITASJON_SAMME_FEIL/);
    expect(rute).toMatch(/invitation\.code_sent/);
    expect(rute).toMatch(/invitation\.code_rate_limited/);
    expect(rute).toMatch(/invitation\.code_failed/);
    expect(rute).toMatch(/invitation\.used/);
    const godta = rute.slice(rute.indexOf("invitasjon.post('/godta'"));
    expect(godta.indexOf('brukInvitasjonskode')).toBeLessThan(godta.indexOf('modul.forbruk'));
    expect(godta).toMatch(/krevInvitasjonCsrf/);
    const send = rute.slice(rute.indexOf("invitasjon.post('/:token/send-kode'"));
    expect(send).toMatch(/kanSendeKode/);
    expect(send).toMatch(/sendt: false/);
    expect(rute).not.toMatch(/#0066ff/);
  });

  it('GET kaller ikke sendEmail og har ingen sideeffekt', () => {
    const rute = readFileSync(resolve(her, '../src/routes/invitasjon.ts'), 'utf8');
    const get = rute.slice(
      rute.indexOf("invitasjon.get('/:token'"),
      rute.indexOf("invitasjon.post('/:token/send-kode'"),
    );
    expect(get).not.toMatch(/sendEmail/);
    expect(get).not.toMatch(/genererInvitasjonskode/);
    expect(get).toMatch(/kreverKode: erWhiteLabelAktiv\(\)/);
  });
});
