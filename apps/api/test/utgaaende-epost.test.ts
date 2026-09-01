import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RESEND_STANDARD_DOMENE as AUTH_STANDARD, avsenderErVerifisert } from '@endwise/auth';
import { createDb, type Database, eq, schema } from '@endwise/db';
import { createMessagesModule, type UtgaaendeEpost } from '@endwise/modules/messages';
import {
  RESEND_FROM_KANONISK as TOOLKIT_FROM,
  RESEND_STANDARD_DOMENE as TOOLKIT_STANDARD,
} from '@endwise/toolkit-resend';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Utgående E-POST fra innboksen.
 * Hva som faktisk kan gå galt her
 * Fram til var kanalvalget ren metadata: raden fikk et
 * konvoluttikon, og ingenting ble sendt. Feilen var usynlig fordi UI-et så
 * riktig ut. Testene under låser de tre tingene som kan bli usynlig gale igjen:
 * 1. **Idempotens** — to forsøk må ikke bli to e-poster hos kunden.
 * 2. **Kanalen på raden må matche det som faktisk ble sendt** — ellers lyver
 * badgen i innboksen, og selgeren tror kunden er varslet.
 * 3. **Avsenderdomenet** — apex mot verifisert subdomene. Samme felle som
 * slo ut hver eneste auth-e-post samme dag.
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

/**
 * Teller kall og lar testen bestemme om «leverandøren» svarer eller kaster.
 * Leverandør-ID-en må være globalt unik, ikke `resend-1` per kanal.
 * `messages` har en unik indeks på `(tenant_id, external_id)`, så to tester i
 * samme tenant som begge skriver «resend-1» gir en constraint-violation — og
 * koden markerer da meldingen `failed`, helt korrekt. Første versjon av denne
 * hjelperen kolliderte med seg selv og fikk det til å se ut som en feil i
 * utsendingen.
 */
function lagKanal(oppsett: { feilMed?: string } = {}) {
  const kall: Array<Record<string, unknown>> = [];
  const prefiks = randomUUID();
  const kanal: UtgaaendeEpost = {
    async send(input) {
      kall.push({ ...input });
      if (oppsett.feilMed) throw new Error(oppsett.feilMed);
      return `${prefiks}-${kall.length}`;
    },
  };
  return { kanal, kall, prefiks };
}

describe('F6-26 — avsenderdomenet', () => {
  it('⛔ toolkit og auth peker på SAMME verifiserte domene', () => {
    /**
     * Konstanten er bevisst duplisert (toolkit kan ikke avhenge av auth uten å
     * dra inn Better-Auth + db). Duplikatet er trygt bare så lenge noe fanger
     * drift — det er denne testen. Glir de fra hverandre, feiler halvparten av
     * e-postene og den andre halvparten virker, som er verst mulig.
     */
    expect(TOOLKIT_STANDARD).toBe(AUTH_STANDARD);
    expect(TOOLKIT_FROM).toBe('Endwise <noreply@endwise.no>');
  });

  it('⛔ notify-varsler går gjennom erProduktDestinasjon, ikke fri to', () => {
    const her = dirname(fileURLToPath(import.meta.url));
    const notify = readFileSync(resolve(her, '../src/workflows/notify.ts'), 'utf8');
    expect(notify).toMatch(/erProduktDestinasjon/);
    expect(notify).toMatch(/kanSendeTil/);
    expect(notify).not.toMatch(/RESEND_FROM/);
    const toolkit = readFileSync(
      resolve(her, '../../../packages/tools/toolkits/resend/src/index.ts'),
      'utf8',
    );
    expect(toolkit).toMatch(/from settes ikke av kalleren/);
    expect(toolkit).toMatch(/kanSendeTil/);
    expect(toolkit).toMatch(/produkt-destinasjon/);
  });

  it('⛔ standard-avsenderen er faktisk et verifisert domene', () => {
    expect(avsenderErVerifisert(`Endwise <noreply@${TOOLKIT_STANDARD}>`)).toBe(true);
  });
});

describeDb('F6-26 — utgående melding fra innboksen', () => {
  let owner: Database;
  let app: Database;
  const tenant = randomUUID();
  const ansatt = `ue-staff-${randomUUID()}`;
  const KUNDE_EPOST = 'kunde@example.no';

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);
    await owner
      .insert(schema.tenants)
      .values({ id: tenant, name: 'Bergen MC', slug: `ue-${tenant.slice(0, 8)}` });
    await owner.insert(schema.user).values({
      id: ansatt,
      name: 'Kari Selger',
      email: `${ansatt}@test.no`,
      emailVerified: true,
    });
    await owner.insert(schema.customers).values({
      tenantId: tenant,
      name: 'Kari Kunde',
      email: KUNDE_EPOST,
    });
  });

  afterAll(async () => {
    await owner.delete(schema.customers).where(eq(schema.customers.tenantId, tenant));
    await owner.delete(schema.user).where(eq(schema.user.id, ansatt));
    await owner.delete(schema.tenants).where(eq(schema.tenants.id, tenant));
  });

  /** Ny e-posttråd med kundeadresse, klar til å sende fra. */
  async function nyEpostTraad(modul: ReturnType<typeof createMessagesModule>) {
    return modul.createThread({
      tenantId: tenant,
      kind: 'customer_dealer',
      subject: 'EU-kontroll',
      channel: 'email',
      externalRef: KUNDE_EPOST,
      participantIds: [ansatt],
    });
  }

  it('⭐ sender e-post, og raden forteller sannheten om det', async () => {
    const { kanal, kall, prefiks } = lagKanal();
    const modul = createMessagesModule(app, { epost: kanal });
    const traad = await nyEpostTraad(modul);

    const melding = await modul.postMessage({
      tenantId: tenant,
      threadId: traad.id,
      authorId: ansatt,
      body: 'Sykkelen er ferdig.',
    });

    expect(kall).toHaveLength(1);
    expect(kall[0]).toMatchObject({
      to: KUNDE_EPOST,
      // Svaret må gå til et menneske, ikke til no-reply. Se F6-27.
      svarTil: `${ansatt}@test.no`,
      avsenderNavn: 'Kari Selger',
      forhandler: 'Bergen MC',
      emne: 'EU-kontroll',
      tekst: 'Sykkelen er ferdig.',
      // Idempotensnøkkelen mot Resend er meldings-ID-en.
      idempotencyKey: melding.id,
    });

    // Kanalen på raden = det som faktisk gikk ut.
    expect(melding.channel).toBe('email');
    expect(melding.deliveryStatus).toBe('sent');
    expect(melding.externalId).toBe(`${prefiks}-1`);
    expect(melding.externalRef).toBe(KUNDE_EPOST);
    expect(melding.deliveryError).toBeNull();
  });

  it('⛔ IDEMPOTENS: en allerede sendt melding sendes ikke på nytt', async () => {
    const { kanal, kall } = lagKanal();
    const modul = createMessagesModule(app, { epost: kanal });
    const traad = await nyEpostTraad(modul);

    const melding = await modul.postMessage({
      tenantId: tenant,
      threadId: traad.id,
      authorId: ansatt,
      body: 'Kun én gang.',
    });
    expect(kall).toHaveLength(1);

    // Retry mot en melding som står som `sent` skal være et null-kall.
    await modul.resendMessage({ tenantId: tenant, messageId: melding.id, readerId: ansatt });
    await modul.resendMessage({ tenantId: tenant, messageId: melding.id, readerId: ansatt });

    expect(kall).toHaveLength(1);
  });

  it('⛔ IDEMPOTENS: to samtidige leveringer gir ÉN e-post', async () => {
    /**
     * Den betingede UPDATE-en er låsen. Uten den ville begge forsøkene sett
     * `pending` og begge sendt — og kunden fått meldingen to ganger.
     */
    const { kanal, kall } = lagKanal();
    const modul = createMessagesModule(app, { epost: kanal });
    const traad = await nyEpostTraad(modul);

    const melding = await modul.postMessage({
      tenantId: tenant,
      threadId: traad.id,
      authorId: ansatt,
      body: 'Samtidig.',
    });
    expect(kall).toHaveLength(1);

    await Promise.all([
      modul.resendMessage({ tenantId: tenant, messageId: melding.id, readerId: ansatt }),
      modul.resendMessage({ tenantId: tenant, messageId: melding.id, readerId: ansatt }),
      modul.resendMessage({ tenantId: tenant, messageId: melding.id, readerId: ansatt }),
    ]);

    expect(kall).toHaveLength(1);
  });

  it('⛔ feilet sending markeres synlig — den ser ikke levert ut', async () => {
    const { kanal, kall } = lagKanal({
      feilMed: '[validation_error] HTTP 403 domain not verified',
    });
    const modul = createMessagesModule(app, { epost: kanal });
    const traad = await nyEpostTraad(modul);

    const melding = await modul.postMessage({
      tenantId: tenant,
      threadId: traad.id,
      authorId: ansatt,
      body: 'Denne feiler.',
    });

    expect(kall).toHaveLength(1);
    expect(melding.deliveryStatus).toBe('failed');
    expect(melding.deliveryError).toContain('403');
    // Meldingen er ikke tapt — det brukeren skrev står fortsatt i tråden.
    expect(melding.body).toBe('Denne feiler.');
  });

  it('en FEILET melding kan sendes på nytt, og lykkes da', async () => {
    const feilende = lagKanal({ feilMed: 'nede' });
    const modulFeil = createMessagesModule(app, { epost: feilende.kanal });
    const traad = await nyEpostTraad(modulFeil);

    const melding = await modulFeil.postMessage({
      tenantId: tenant,
      threadId: traad.id,
      authorId: ansatt,
      body: 'Prøv igjen.',
    });
    expect(melding.deliveryStatus).toBe('failed');

    // Samme melding, ny kanal som virker — slik en retry etter en utfall ser ut.
    const virkende = lagKanal();
    const modulOk = createMessagesModule(app, { epost: virkende.kanal });
    const etter = await modulOk.resendMessage({
      tenantId: tenant,
      messageId: melding.id,
      readerId: ansatt,
    });

    expect(virkende.kall).toHaveLength(1);
    expect(etter.deliveryStatus).toBe('sent');
    expect(etter.deliveryError).toBeNull();
  });

  it('⛔ app-tråder sender ingenting og får ingen leveringsstatus', async () => {
    const { kanal, kall } = lagKanal();
    const modul = createMessagesModule(app, { epost: kanal });
    const traad = await modul.createThread({
      tenantId: tenant,
      kind: 'mechanic_dealer',
      subject: 'Intern',
      channel: 'app',
      externalRef: null,
      participantIds: [ansatt],
    });

    const melding = await modul.postMessage({
      tenantId: tenant,
      threadId: traad.id,
      authorId: ansatt,
      body: 'Bare internt.',
    });

    expect(kall).toHaveLength(0);
    expect(melding.channel).toBe('app');
    expect(melding.deliveryStatus).toBeNull();
  });

  it('⛔ e-posttråd UTEN adresse blir en app-melding, ikke en evig pending', async () => {
    /**
     * En tråd merket `email` uten `external_ref` kan ingen nås på. Å skrive
     * raden som `email`/`pending` ville lagt igjen en melding som ser ut som
     * den er på vei ut, for alltid.
     */
    const { kanal, kall } = lagKanal();
    const modul = createMessagesModule(app, { epost: kanal });
    const traad = await modul.createThread({
      tenantId: tenant,
      kind: 'customer_dealer',
      subject: 'Uten adresse',
      channel: 'email',
      externalRef: null,
      participantIds: [ansatt],
    });

    const melding = await modul.postMessage({
      tenantId: tenant,
      threadId: traad.id,
      authorId: ansatt,
      body: 'Ingen adresse å sende til.',
    });

    expect(kall).toHaveLength(0);
    expect(melding.channel).toBe('app');
    expect(melding.deliveryStatus).toBeNull();
  });

  it('⛔ uten e-postkanal koblet på feiler den synlig, ikke stille', async () => {
    // Typisk lokalt uten RESEND_API_KEY. Skal ikke se ut som en sendt melding.
    const modul = createMessagesModule(app, {});
    const traad = await nyEpostTraad(modul);

    const melding = await modul.postMessage({
      tenantId: tenant,
      threadId: traad.id,
      authorId: ansatt,
      body: 'Ingen kanal.',
    });

    expect(melding.deliveryStatus).toBe('failed');
    expect(melding.deliveryError).toContain('ikke konfigurert');
  });

  it('⛔ en ikke-deltaker kan ikke sende en melding på nytt', async () => {
    const { kanal } = lagKanal();
    const modul = createMessagesModule(app, { epost: kanal });
    const traad = await nyEpostTraad(modul);
    const melding = await modul.postMessage({
      tenantId: tenant,
      threadId: traad.id,
      authorId: ansatt,
      body: 'Min tråd.',
    });

    await expect(
      modul.resendMessage({
        tenantId: tenant,
        messageId: melding.id,
        readerId: `fremmed-${randomUUID()}`,
      }),
    ).rejects.toThrow(/ikke deltaker/i);
  });

  it('⛔ e-posttråd til ukjent adresse avvises — ingen vilkårlig to', async () => {
    const { kanal, kall } = lagKanal();
    const modul = createMessagesModule(app, { epost: kanal });
    await expect(
      modul.createThread({
        tenantId: tenant,
        kind: 'customer_dealer',
        subject: 'Spam',
        channel: 'email',
        externalRef: 'hvem-som-helst@evil.no',
        participantIds: [ansatt],
      }),
    ).rejects.toThrow(/kjent kunde|UNKNOWN_INBOX/i);
    expect(kall).toHaveLength(0);
  });

  it('⛔ postMessage ignorerer klient-to — sender bare thread.external_ref', async () => {
    const { kanal, kall } = lagKanal();
    const modul = createMessagesModule(app, { epost: kanal });
    const traad = await nyEpostTraad(modul);
    await modul.postMessage({
      tenantId: tenant,
      threadId: traad.id,
      authorId: ansatt,
      body: 'Hei',
      externalRef: 'fremmed@evil.no',
    });
    expect(kall).toHaveLength(1);
    expect(kall[0]?.to).toBe(KUNDE_EPOST);
    expect(kall[0]?.to).not.toBe('fremmed@evil.no');
    expect(kall[0]?.svarTil).toBe(`${ansatt}@test.no`);
  });
});
