import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LOGO_EPOST_CID, LOGO_EPOST_PNG_BASE64 } from '../src/assets/logo-epost.ts';
import { avsenderDomene, avsenderErVerifisert, RESEND_VERIFISERTE_DOMENER } from '../src/env.ts';
import { byggEpostHtml, esc, knapp, kodeboks } from '../src/senders/epost-mal.ts';

/**
 * F1-11 / F1-16 — **e-postinnholdet, låst.**
 *
 * ── Hvorfor akkurat disse ────────────────────────────────────────────────
 * Alle feilene som ble rettet 22.08.2026 er STILLE feil: e-posten sendes, den
 * ser riktig ut i koden, og den er ubrukelig i innboksen. Ingen av dem gir
 * typefeil, og ingen av dem kaster.
 *
 *   · feil avsenderdomene   → 403 på HVER auth-e-post
 *   · SVG som logo          → tomt bilde hos Gmail/Outlook/Apple Mail
 *   · `data:`-URI i `src`   → strippes av Gmail og Outlook
 *   · logo uten egen flate  → usynlig i mørk modus
 *   · HTML uten tekstdel    → ingen kode for den som leser i ren tekst
 */

const OPPRINNELIG = { ...process.env };

afterEach(() => {
  process.env = { ...OPPRINNELIG };
  vi.restoreAllMocks();
});

describe('avsenderdomene', () => {
  it('godtar begge domenene som er verifisert i Resend', () => {
    /**
     * ⚠️ Om morgenen 22.08.2026 var KUN `no-reply.endwise.no` verifisert, og
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
     * påstått at `post.endwise.no` er godkjent fordi `endwise.no` er det —
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
    // Uten RESEND_FROM faller vi tilbake på en literal. Er DEN feil, feiler
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

  it('har alfakanal, så den kan ligge på den mørke flata', () => {
    const bytes = Buffer.from(LOGO_EPOST_PNG_BASE64, 'base64');
    // IHDR: bredde/høyde på byte 16–23, fargetype på byte 25.
    // 6 = RGBA, 3 = palett (med tRNS for gjennomsiktighet).
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

  it('⛔ logoen ligger på en flate med eksplisitt bgcolor — mørk modus', () => {
    /**
     * Logoen er HVIT. Uten en egen mørk flate ville den vært usynlig i enhver
     * klient som ikke inverterer. `bgcolor` som ATTRIBUTT (ikke bare CSS)
     * overlever i praktisk talt alle klienter, også Outlooks Word-motor.
     */
    expect(html).toMatch(/<td[^>]+bgcolor="#0b0b0b"/);
    expect(html).toContain('background-color:#0b0b0b');
  });

  it('oppgir width og height på bildet, så layouten ikke hopper', () => {
    expect(html).toMatch(/<img[^>]+width="32"[^>]*height="40"/);
  });

  it('erklærer at den takler begge fargeskjemaene', () => {
    expect(html).toContain('name="color-scheme"');
    expect(html).toContain('name="supported-color-schemes"');
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
    const k = knapp('https://endwise.no/nytt-passord?token=abc', 'Velg nytt passord');
    expect(k).toContain('href="https://endwise.no/nytt-passord?token=abc"');
    expect(k).toContain('Lim inn denne adressen');
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
    process.env.RESEND_FROM = 'Endwise <no-reply@no-reply.endwise.no>';
  });

  /**
   * ⛔ Koden MÅ finnes i tekstdelen også. En engangskode som bare står i
   * HTML-en, finnes ikke for den som leser i ren tekst — og det er nettopp
   * den brukeren som ikke får logget inn og ikke skjønner hvorfor.
   */
  it('⛔ sender BÅDE html og ren tekst, med koden i begge', async () => {
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

    const { sendTwoFactorOtp } = await last();
    await sendTwoFactorOtp('mikkis@twofold.no', '482913');

    expect(sendt).toHaveLength(1);
    const p = sendt[0] as { text: string; html: string; subject: string; attachments?: unknown[] };
    expect(p.text).toContain('482913');
    expect(p.html).toContain('482913');
    // Emnefeltet bærer koden, så den kan leses fra varselet uten å åpne.
    expect(p.subject).toContain('482913');
    // Logoen skal følge med som inline vedlegg.
    expect(p.attachments).toHaveLength(1);
    expect(p.attachments?.[0]).toMatchObject({
      contentId: LOGO_EPOST_CID,
      contentType: 'image/png',
    });
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

describe('invitasjons-e-posten (F1-10)', () => {
  async function last() {
    vi.resetModules();
    return import('../src/senders/resend.ts');
  }

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.RESEND_API_KEY = 'test-nokkel';
    process.env.RESEND_FROM = 'Endwise <no-reply@no-reply.endwise.no>';
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
    expect(p.text).toContain('https://endwise.no/invitasjon/eksempel');
    expect(p.html).toContain('Åpne invitasjonen');
    expect(p.html).toContain(`src="cid:${LOGO_EPOST_CID}"`);
    expect(p.html).not.toContain('src="data:');
    expect(p.attachments).toHaveLength(1);
    expect(p.attachments?.[0]).toMatchObject({
      contentId: LOGO_EPOST_CID,
      contentType: 'image/png',
    });
    vi.doUnmock('resend');
  });
});
