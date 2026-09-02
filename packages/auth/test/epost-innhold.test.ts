import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LOGO_EPOST_CID, LOGO_EPOST_PNG_BASE64 } from '../src/assets/logo-epost.ts';
import { avsenderDomene, avsenderErVerifisert, RESEND_VERIFISERTE_DOMENER } from '../src/env.ts';
import { byggEpostHtml, esc, knapp, kodeboks } from '../src/senders/epost-mal.ts';

/**
 * F1-11 / F1-16 — **e-postinnholdet, låst.**
 * Hvorfor akkurat disse
 * Alle feilene som ble er stille feil: e-posten sendes, den
 * ser riktig ut i koden, og den er ubrukelig i innboksen. Ingen av dem gir
 * typefeil, og ingen av dem kaster.
 * feil avsenderdomene → 403 på hver auth-e-post
 * SVG som logo → tomt bilde hos Gmail/Outlook/Apple Mail
 * `data:`-URI i `src` → strippes av Gmail og Outlook
 * logo på mørk chrome → bryter Apple-låsen (logo på hvit)
 * HTML uten tekstdel → ingen kode for den som leser i ren tekst
 */

const OPPRINNELIG = { ...process.env };

afterEach(() => {
  process.env = { ...OPPRINNELIG };
  vi.restoreAllMocks();
});

describe('avsenderdomene', () => {
  it('godtar begge domenene som er verifisert i Resend', () => {
    /**
     * Om morgenen var kun `no-reply.endwise.no` verifisert, og
     * apex-domenet ga 403 på hver auth-e-post. Senere samme dag ble apex også
     * verifisert. Begge er gyldige nå — lista er fasiten, ikke hukommelsen.
     */
    expect(avsenderErVerifisert('Endwise <no-reply@endwise.no>')).toBe(true);
    expect(avsenderErVerifisert('Endwise <noreply@endwise.no>')).toBe(true);
    expect(avsenderErVerifisert('Endwise <no-reply@no-reply.endwise.no>')).toBe(true);
  });

  it('plukker domenet ut av begge skrivemåtene', () => {
    expect(avsenderDomene('a@b.no')).toBe('b.no');
    expect(avsenderDomene('Navn <a@b.no>')).toBe('b.no');
    expect(avsenderDomene('Navn <A@B.NO>')).toBe('b.no');
    expect(avsenderDomene('ikke-en-adresse')).toBeNull();
    expect(avsenderDomene('mangler-domene@')).toBeNull();
  });

  it('⛔ EKSAKT treff — et uverifisert subdomene slipper ikke gjennom', () => {
    /**
     * Resend verifiserer hvert domene for seg. En `endsWith`-regel ville
     * påstått at `post.endwise.no` er godkjent fordi `endwise.no` er det
     * og den e-posten ville 403-et i produksjon. Lista er eksakt.
     */
    expect(avsenderErVerifisert('x@post.endwise.no')).toBe(false);
    expect(avsenderErVerifisert('x@endwise.no.ondt.no')).toBe(false);
    expect(avsenderErVerifisert('x@ondt-endwise.no')).toBe(false);
    for (const d of RESEND_VERIFISERTE_DOMENER) {
      expect(avsenderErVerifisert(`x@${d}`)).toBe(true);
    }
  });

  it('⭐ standardverdien i env.ts er på det verifiserte domenet', async () => {
    // Uten RESEND_FROM faller vi tilbake på en literal. Er den feil, feiler
    // hvert miljø som ikke setter variabelen — stille, helt til noen prøver
    // å logge inn.
    process.env.RESEND_API_KEY = 'test-nokkel';
    process.env.RESEND_FROM = '';
    vi.resetModules();
    const { authEnv } = await import('../src/env.ts');
    expect(avsenderErVerifisert(authEnv.resend.from)).toBe(true);
  });
});

describe('logoen', () => {
  it('⛔ er PNG, ikke SVG — e-postklienter rendrer ikke SVG', () => {
    // PNG-signatur: 89 50 4E 47.
    const bytes = Buffer.from(LOGO_EPOST_PNG_BASE64, 'base64');
    expect(bytes.subarray(0, 4).toString('hex')).toBe('89504e47');
  });

  it('har alfakanal, så den kan ligge på hvit canvas', () => {
    const bytes = Buffer.from(LOGO_EPOST_PNG_BASE64, 'base64');
    // Ihdr: bredde/høyde på byte 16–23, fargetype på byte 25.
    // 6 = rgba, 3 = palett (med tRNS for gjennomsiktighet).
    const fargetype = bytes[25];
    expect([3, 4, 6]).toContain(fargetype);
    expect(bytes.readUInt32BE(16)).toBe(64);
    expect(bytes.readUInt32BE(20)).toBe(80);
  });

  it('er liten nok til å sendes med hver e-post', () => {
    expect(LOGO_EPOST_PNG_BASE64.length).toBeLessThan(10 * 1024);
  });
});

describe('e-postmalen', () => {
  const html = byggEpostHtml({
    tittel: 'Engangskode til Endwise',
    ingress: 'Koden din er 123456.',
    innhold: kodeboks('123456'),
    fotnote: 'Har du ikke bedt om denne koden, si fra.',
  });

  it('⛔ refererer logoen som cid:, ALDRI som data:-URI', () => {
    /**
     * Gmail og Outlook fjerner `data:`-URI-er i `<img src>`. En «inline
     * base64-logo» i markupen er derfor et tomt felt hos de fleste mottakere.
     * `cid:` mot et inline vedlegg er varianten som faktisk vises.
     */
    expect(html).toContain(`src="cid:${LOGO_EPOST_CID}"`);
    expect(html).not.toContain('src="data:');
  });

  it('⛔ har alt-tekst — for dem som blokkerer bilder', () => {
    // Mange klienter laster ikke bilder før brukeren ber om det. Da er
    // alt-teksten det eneste som står der logoen skulle vært.
    expect(html).toMatch(/<img[^>]+alt="Endwise"/);
  });

  it('⛔ logoen ligger på hvit canvas — ikke mørk chrome', () => {
    /**
     * Mikael Apple-lås: parchment/white, logo på hvit. `bgcolor` som attributt
     * (ikke bare CSS) overlever i Outlooks Word-motor.
     */
    expect(html).toMatch(/<td[^>]+bgcolor="#ffffff"/);
    expect(html).toContain('background-color:#ffffff');
    expect(html).not.toMatch(/#0b0b0b|#1ED27D|#111111/);
    expect(html).not.toMatch(/box-shadow/);
  });

  it('bruker Apple/Endwise-tokens: parchment, ink, Action Blue, Inter, 17px', () => {
    expect(html).toContain('background-color:#f5f5f7');
    expect(html).toContain('color:#1d1d1f');
    expect(html).toContain('font-size:17px');
    expect(html).toContain('font-family:Inter, -apple-system');
    expect(html).toContain('name="color-scheme" content="light"');
    expect(html).not.toContain('content="light dark"');
  });

  it('oppgir width og height på bildet, så layouten ikke hopper', () => {
    expect(html).toMatch(/<img[^>]+width="32"[^>]*height="40"/);
  });

  it('erklærer lyst fargeskjema — produktet har ingen dark-mode-sti', () => {
    expect(html).toContain('name="color-scheme" content="light"');
    expect(html).toContain('name="supported-color-schemes" content="light"');
  });

  it('bruker tabeller og inline style — ikke flexbox eller klasser', () => {
    expect(html).toContain('role="presentation"');
    expect(html).not.toMatch(/display:\s*flex/);
    expect(html).not.toMatch(/<link[^>]+stylesheet/);
  });

  it('⛔ escaper det som interpoleres', () => {
    const ondt = byggEpostHtml({
      tittel: '<script>alert(1)</script>',
      ingress: 'x',
      innhold: kodeboks('1"><b>2'),
      fotnote: 'y',
    });
    expect(ondt).not.toContain('<script>alert(1)</script>');
    expect(ondt).toContain('&lt;script&gt;');
    expect(esc(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
  });

  it('knappen gjentar adressen som lesbar tekst', () => {
    // Bedriftsfiltre skriver om og dreper knapper. Da er den synlige
    // adressen forskjellen på en e-post som virker og en som ikke gjør det.
    const k = knapp('https://endwise.no/signin?token=abc', 'Logg inn');
    expect(k).toContain('href="https://endwise.no/signin?token=abc"');
    expect(k).toContain('Lim inn denne adressen');
    expect(k).toContain('background-color:#0066cc');
    expect(k).toContain('border-radius:9999px');
    expect(k).not.toMatch(/passord/i);
  });
});

describe('engangskode-e-posten', () => {
  async function last() {
    vi.resetModules();
    return import('../src/senders/resend.ts');
  }

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.RESEND_API_KEY = 'test-nokkel';
    process.env.RESEND_FROM = 'Endwise <noreply@endwise.no>';
  });

  it('magic-link-e-posten er gammel OTP-stil: synlig kode + Logg inn, ikke TOTP', async () => {
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
      to: 'mikkis@twofold.no',
      lenke: 'https://endwise.no/api/auth/magic-link/verify?token=ABCD',
      kode: 'ABCDEFGH2345',
      utloper: new Date('2026-09-01T19:00:00.000Z'),
    });

    expect(sendt).toHaveLength(1);
    const p = sendt[0] as { from: string; text: string; html: string; subject: string };
    expect(p.from).toBe('Endwise <noreply@endwise.no>');
    expect(p.subject).toBe('Logg inn på Endwise');
    expect(p.text).toMatch(/Kode:\s*ABCD-EFGH-2345/);
    expect(p.html).toContain('ABCD-EFGH-2345');
    expect(p.html).toContain('Logg inn');
    expect(p.html).toContain('Koden din er');
    expect(p.html).not.toMatch(/TOTP|app-kode|autentikator/i);
    expect(p.text).not.toMatch(/TOTP|app-kode|autentikator/i);
    expect(p.html).not.toMatch(/passord|1Password|demo|seed/i);
    expect(p.text).not.toMatch(/passord|1Password|demo|seed/i);
    expect(p.html).toContain('#0066cc');
    expect(p.html).toContain('#f5f5f7');
    vi.doUnmock('resend');
  });

  it('⛔ sendTwoFactorOtp er stengt — ingen e-post-OTP', async () => {
    const { sendTwoFactorOtp } = await last();
    await expect(sendTwoFactorOtp('mikkis@twofold.no', '482913')).rejects.toThrow(
      /ikke andre faktor/,
    );
  });

  it('⛔ sendBekreftelseskode bruker kanonisk From og escaper', async () => {
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

    const { sendBekreftelseskode } = await last();
    await sendBekreftelseskode('mikkis@twofold.no', '482913');

    expect(sendt).toHaveLength(1);
    const p = sendt[0] as { from: string; text: string; html: string; subject: string };
    expect(p.from).toBe('Endwise <noreply@endwise.no>');
    expect(p.text).toContain('482913');
    expect(p.html).toContain('482913');
    expect(p.subject).toContain('482913');
    vi.doUnmock('resend');
  });

  it('⛔ feilmeldingen bærer name og statuskode, ikke bare teksten', async () => {
    /**
     * «The endwise.no domain is not verified» og «This API key is restricted»
     * krever helt ulike fikser. Uten `name` og statuskoden er de to like
     * ugjennomtrengelige linjer i en logg.
     */
    vi.doMock('resend', () => ({
      Resend: class {
        emails = {
          send: async () => ({
            data: null,
            error: {
              name: 'validation_error',
              message: 'The endwise.no domain is not verified.',
              statusCode: 403,
            },
          }),
        };
      },
    }));

    const { sendEmail } = await last();
    await expect(sendEmail({ to: 'a@b.no', subject: 's', text: 't' })).rejects.toThrow(
      /\[validation_error\].*HTTP 403.*not verified/s,
    );
    vi.doUnmock('resend');
  });
});

describe('passordreset-e-posten (F1-16)', () => {
  async function last() {
    vi.resetModules();
    return import('../src/senders/resend.ts');
  }

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.RESEND_API_KEY = 'test-nokkel';
    process.env.RESEND_FROM = 'Endwise <noreply@endwise.no>';
  });

  it('⛔ sendPasswordReset er stengt', async () => {
    const { sendPasswordReset } = await last();
    await expect(
      sendPasswordReset({
        to: 'mikkis@twofold.no',
        lenke: 'https://endwise.no/nytt-passord?token=eksempel',
        utloper: new Date('2026-08-29T05:46:00.000Z'),
      }),
    ).rejects.toThrow(/Passordreset er stengt/);
  });
});

describe('invitasjons-e-posten (F1-10)', () => {
  async function last() {
    vi.resetModules();
    return import('../src/senders/resend.ts');
  }

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.RESEND_API_KEY = 'test-nokkel';
    process.env.RESEND_FROM = 'Endwise <noreply@endwise.no>';
  });

  it('sender HTML med cid-logo og knappen «Åpne invitasjonen»', async () => {
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

    const { sendInvitation } = await last();
    await sendInvitation({
      to: 'ny@verksted.test',
      lenke: 'https://endwise.no/invitasjon/eksempel',
      forhandler: 'Verksted A',
      funksjon: 'support',
      utloper: new Date('2026-09-01T12:00:00Z'),
    });

    expect(sendt).toHaveLength(1);
    const p = sendt[0] as { text: string; html: string; subject: string; attachments?: unknown[] };
    expect(p.subject).toBe('Du er invitert til Verksted A i Endwise');
    expect((p as { from?: string }).from).toBe('Endwise <noreply@endwise.no>');
    expect(p.text).toContain('https://endwise.no/invitasjon/eksempel');
    expect(p.text).toMatch(/godta invitasjonen og logge inn/);
    expect(p.text).not.toMatch(/sett passord/i);
    expect(p.html).toContain('Åpne invitasjonen');
    expect(p.html).not.toMatch(/sett passord|1Password|demo|seed/i);
    expect(p.html).toContain('#0066cc');
    expect(p.html).toContain(`src="cid:${LOGO_EPOST_CID}"`);
    expect(p.html).not.toContain('src="data:');
    expect(p.attachments).toHaveLength(1);
    expect(p.attachments?.[0]).toMatchObject({
      contentId: LOGO_EPOST_CID,
      contentType: 'image/png',
    });
    vi.doUnmock('resend');
  });

  it('⛔ sendEmail avviser klient-From', async () => {
    const { sendEmail } = await last();
    await expect(
      sendEmail({
        to: 'a@b.no',
        subject: 's',
        text: 't',
        from: 'Hacker <evil@evil.no>',
      } as never),
    ).rejects.toThrow(/from settes ikke/);
  });
});

describe('e-postbytte-e-posten (F1-27)', () => {
  async function last() {
    vi.resetModules();
    return import('../src/senders/resend.ts');
  }

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.RESEND_API_KEY = 'test-nokkel';
    process.env.RESEND_FROM = 'Endwise <noreply@endwise.no>';
  });

  it('⛔ nevner ikke passord i bekreftelsen til gammel adresse', async () => {
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

    const { sendByttEpostBekreftelse } = await last();
    await sendByttEpostBekreftelse({
      to: 'gammel@twofold.no',
      nyEpost: 'ny@twofold.no',
      lenke: 'https://endwise.no/bekreft-epost?token=eksempel',
    });

    expect(sendt).toHaveLength(1);
    const p = sendt[0] as { text: string; html: string };
    expect(p.text).not.toMatch(/passord|1Password/i);
    expect(p.html).not.toMatch(/passord|1Password/i);
    expect(p.html).toContain('#0066cc');
    expect(p.html).toContain('Bekreft e-postbytte');
    vi.doUnmock('resend');
  });
});
