import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LOGO_EPOST_CID } from '../src/assets/logo-epost.ts';
import {
  byggInnloggingsEpostHtml,
  innloggingsEpostEmne,
  merkeHodeHtml,
} from '../src/senders/epost-mal.ts';
import { epostMerkeFraSone } from '../src/senders/tenant-merke.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('F42-02: e-postmerke følger verten', () => {
  it('<sub> er forhandler; app og platform er Endwise', () => {
    expect(epostMerkeFraSone('forhandler')).toBe('forhandler');
    expect(epostMerkeFraSone('app')).toBe('endwise');
    expect(epostMerkeFraSone('platform')).toBe('endwise');
    expect(epostMerkeFraSone(null)).toBe('endwise');
  });

  it('sendMagicLink på forhandler-sone slår opp merke; app/platform gjør det ikke', () => {
    const auth = les('../src/auth.ts');
    const send = auth.slice(
      auth.indexOf('sendMagicLink: async'),
      auth.indexOf('passkeyPlugin({ sone'),
    );
    expect(send).toMatch(/epostMerkeFraSone\(sone\) === 'forhandler'/);
    expect(send).toMatch(/hentEpostMerke\(db, tenantId\)/);
    expect(send).toMatch(/merke,/);
  });

  it('innlogging på <sub> har forhandler-From, logo/initial og ikke Endwise-cid', () => {
    const merke = {
      navn: 'Bergen',
      levertAv: true,
      logoUrl: 'https://blob.example/bergen.png',
    };
    const html = byggInnloggingsEpostHtml({
      navn: 'Kari',
      kode: '12345',
      lenke: 'https://bergen.endwise.no/api/auth/magic-link/verify?token=12345',
      merke,
    });
    expect(innloggingsEpostEmne('12345', merke)).toBe('Din kode er 12345');
    expect(html).toContain('https://blob.example/bergen.png');
    expect(html).toContain('alt="Bergen"');
    expect(html).toContain('Levert av Endwise');
    expect(html).not.toContain(`cid:${LOGO_EPOST_CID}`);
    expect(html).not.toContain('alt="Endwise"');
    expect(merkeHodeHtml(merke)).toContain('bergen.png');
    expect(merkeHodeHtml({ navn: 'Bergen', levertAv: true })).toMatch(/>B</);
    expect(merkeHodeHtml({ navn: 'Bergen', levertAv: true })).toContain('Bergen');
  });

  it('innlogging på app/platform har Endwise-From og cid-logo', () => {
    const html = byggInnloggingsEpostHtml({
      navn: 'Mikael',
      kode: '48291',
      lenke: 'https://app.endwise.no/api/auth/magic-link/verify?token=48291',
    });
    expect(innloggingsEpostEmne('48291')).toBe('Din midlertidige Endwise kode er 48291');
    expect(html).toContain(`cid:${LOGO_EPOST_CID}`);
    expect(html).toContain('alt="Endwise"');
    expect(html).not.toContain('Levert av Endwise');
    expect(merkeHodeHtml()).toContain(`cid:${LOGO_EPOST_CID}`);
  });

  it('login sender ikke velkomst — den går bare ved opprett kunde', () => {
    const hook = les('../src/magic-link-2fa.ts');
    expect(hook).not.toMatch(/sendVelkomstEtterKnytning/);
    expect(les('../../../apps/api/src/trpc/routers/customers.ts')).toMatch(
      /sendVelkomstEtterKnytning/,
    );
  });
});

describe('sendMagicLink From følger merke', () => {
  async function last() {
    vi.resetModules();
    return import('../src/senders/resend.ts');
  }

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.RESEND_API_KEY = 'test-nokkel';
    process.env.RESEND_FROM = 'Endwise <noreply@endwise.no>';
  });

  afterEach(() => {
    vi.doUnmock('resend');
  });

  it('forhandler-vert: From er visningsnavn, ikke Endwise', async () => {
    const sendt: Record<string, unknown>[] = [];
    vi.doMock('resend', () => ({
      Resend: class {
        emails = {
          send: async (payload: Record<string, unknown>) => {
            sendt.push(payload);
            return { data: { id: 'x' }, error: null };
          },
        };
      },
    }));
    const { sendMagicLink } = await last();
    await sendMagicLink({
      to: 'kari@kunde.no',
      lenke: 'https://bergen.endwise.no/api/auth/magic-link/verify?token=12345',
      kode: '12345',
      navn: 'Kari',
      utloper: new Date('2026-11-05T12:00:00.000Z'),
      merke: { navn: 'Bergen', levertAv: true, logoUrl: 'https://blob.example/b.png' },
    });
    expect(sendt).toHaveLength(1);
    const p = sendt[0] as { from: string; subject: string; html: string };
    expect(p.from).toBe('Bergen <noreply@endwise.no>');
    expect(p.subject).toBe('Din kode er 12345');
    expect(p.html).toContain('https://blob.example/b.png');
    expect(p.html).not.toContain(`cid:${LOGO_EPOST_CID}`);
  });

  it('app-vert: From er Endwise', async () => {
    const sendt: Record<string, unknown>[] = [];
    vi.doMock('resend', () => ({
      Resend: class {
        emails = {
          send: async (payload: Record<string, unknown>) => {
            sendt.push(payload);
            return { data: { id: 'x' }, error: null };
          },
        };
      },
    }));
    const { sendMagicLink } = await last();
    await sendMagicLink({
      to: 'ola@verksted.no',
      lenke: 'https://app.endwise.no/api/auth/magic-link/verify?token=48291',
      kode: '48291',
      navn: 'Ola',
      utloper: new Date('2026-11-05T12:00:00.000Z'),
    });
    expect(sendt).toHaveLength(1);
    const p = sendt[0] as { from: string; subject: string; html: string };
    expect(p.from).toBe('Endwise <noreply@endwise.no>');
    expect(p.subject).toBe('Din midlertidige Endwise kode er 48291');
    expect(p.html).toContain(`cid:${LOGO_EPOST_CID}`);
  });
});
