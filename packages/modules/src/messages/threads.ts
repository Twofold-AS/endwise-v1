import {
  and,
  type Database,
  desc,
  eq,
  inArray,
  schema,
  sql,
  withPlatformAdmin,
  withTenant,
} from '@endwise/db';
import { visningsnavn } from '../profil/index.ts';
import { publishEvent } from '../stream/publisher.ts';

export class NotAParticipantError extends Error {
  readonly code = 'NOT_A_PARTICIPANT';
  constructor(participantId: string, threadId: string) {
    super(`${participantId} er ikke deltaker i tråd ${threadId}`);
  }
}

/**
 * Visningsnavn for dealer↔Endwise. Kun medlemmer av forhandler-org eller
 * Endwise-org — ikke kunder (ingen PII-orakel).
 */
async function navnForDealerOgEndwise(
  db: Database,
  tenantId: string,
  userIds: string[],
): Promise<Map<string, string>> {
  const unike = [...new Set(userIds)].filter((id) => id && !id.startsWith('agent:'));
  const ut = new Map<string, string>();
  if (unike.length === 0) return ut;

  const [ew] = await db
    .select({ id: schema.organization.id })
    .from(schema.organization)
    .where(eq(schema.organization.slug, 'endwise'))
    .limit(1);
  const orgIds = [tenantId, ew?.id].filter((id): id is string => Boolean(id));

  const ansatte = await db
    .select({ id: schema.user.id, name: schema.user.name })
    .from(schema.user)
    .innerJoin(schema.member, eq(schema.member.userId, schema.user.id))
    .where(and(inArray(schema.member.organizationId, orgIds), inArray(schema.user.id, unike)));

  const kallenavn = new Map<string, string>();
  for (const orgId of orgIds) {
    const rader = await withTenant(db, orgId, (tx) =>
      tx
        .select({
          userId: schema.memberProfiles.userId,
          nickname: schema.memberProfiles.nickname,
        })
        .from(schema.memberProfiles)
        .where(
          and(
            eq(schema.memberProfiles.tenantId, orgId),
            inArray(schema.memberProfiles.userId, unike),
          ),
        ),
    ).catch(() => []);
    for (const r of rader) if (r.nickname) kallenavn.set(r.userId, r.nickname);
  }

  for (const a of ansatte) {
    if (ut.has(a.id)) continue;
    const vis = visningsnavn(
      { navn: a.name ?? '', kallenavn: kallenavn.get(a.id) ?? null },
      'intern',
    );
    if (vis.trim()) ut.set(a.id, vis);
  }
  return ut;
}

/** F5-11 — tråden finnes ikke, eller er ikke forhandler↔Endwise. */
export class PlatformSupportNotFoundError extends Error {
  readonly code = 'PLATFORM_SUPPORT_NOT_FOUND';
  constructor(threadId: string) {
    super(`Fant ikke support-tråd ${threadId}`);
  }
}

/**
 * F6-01 — Meldings-modulen.
 *
 * To lag med tilgangskontroll, og de fanger to ULIKE feil:
 *   - RLS:        «hvilken tenants tråder?» — hindrer at forhandler A ser B
 *   - deltakelse: «er DU med i denne tråden?» — hindrer at en ansatt hos A
 *                 leser en kundesamtale hos A som han ikke er del av
 *
 * Bare RLS ville gitt hver ansatt tilgang til hver kundes samtale i huset.
 * Det er ikke en tenant-lekkasje, men det er fortsatt en lekkasje.
 */
/** Kanalene en melding kan komme inn / gå ut på. Speiler `message_channel`. */
export type MessageChannel = 'app' | 'sms' | 'email' | 'web';
export type MessageDirection = 'inbound' | 'outbound';

/**
 * F6-26 — transporten for en utgående e-postmelding.
 *
 * Et GRENSESNITT, ikke en Resend-import. `packages/modules` avhenger av `db` og
 * `events` og ingenting annet (F0-06: moduler skal kunne bytte leverandør), så
 * den konkrete kanalen kobles på i `apps/api` — nøyaktig som `createDispatcher`
 * tar sine kanaler utenfra i F3-04.
 */
export interface UtgaaendeEpost {
  /** Returnerer leverandørens meldings-ID, som lagres i `messages.external_id`. */
  send(input: {
    to: string;
    svarTil: string;
    avsenderNavn: string;
    forhandler: string;
    emne: string | null;
    tekst: string;
    idempotencyKey: string;
  }): Promise<string | undefined>;
}

export function createMessagesModule(db: Database, kanaler: { epost?: UtgaaendeEpost } = {}) {
  /** Én melding, uavhengig av tråd. Brukes til å lese status etter levering. */
  async function hentMelding(tenantId: string, messageId: string) {
    const [rad] = await withTenant(db, tenantId, (tx) =>
      tx.select().from(schema.messages).where(eq(schema.messages.id, messageId)),
    );
    return rad ?? null;
  }

  /**
   * ⛔ **IDEMPOTENSVAKTEN.** Leverer én melding, og gjør det høyst én gang.
   *
   * Mønsteret er F3-04s: ta eierskap i basen FØR nettverkskallet, slik at to
   * samtidige forsøk ikke kan bli to e-poster. Forskjellen fra dispatcheren er
   * at vi går via `sending` i stedet for rett til `sent` — se
   * `messageDeliveryEnum` for hvorfor en krasj midt i kallet ellers ville
   * etterlatt en rad som påstår at den gikk.
   *
   * Den betingede UPDATE-en er selve låsen: `WHERE delivery_status IN
   * ('pending','failed')` treffer null rader hvis noen andre allerede har tatt
   * den, og da returnerer vi uten å sende. `sent` kan aldri plukkes opp igjen.
   */
  async function leverEpost(tenantId: string, messageId: string): Promise<void> {
    const krav = await withTenant(db, tenantId, (tx) =>
      tx
        .update(schema.messages)
        .set({ deliveryStatus: 'sending', deliveryError: null })
        .where(
          and(
            eq(schema.messages.id, messageId),
            // Kun disse to. `sending` og `sent` er allerede tatt.
            sql`${schema.messages.deliveryStatus} in ('pending','failed')`,
          ),
        )
        .returning(),
    );

    const melding = krav[0];
    if (!melding) return; // noen andre holder på, eller den er allerede sendt

    async function markerFeilet(grunn: string): Promise<void> {
      await withTenant(db, tenantId, (tx) =>
        tx
          .update(schema.messages)
          .set({ deliveryStatus: 'failed', deliveryError: grunn.slice(0, 500) })
          .where(eq(schema.messages.id, messageId)),
      );
    }

    if (!kanaler.epost) {
      // Ingen kanal koblet på (typisk: RESEND_API_KEY mangler lokalt). Det er
      // en KONFIGURASJONSFEIL, og den skal være synlig i tråden — ikke en
      // stille app-melding som ser levert ut.
      await markerFeilet('E-postkanalen er ikke konfigurert på serveren.');
      return;
    }

    // Avsenderens navn og e-post, og forhandlerens navn. Alt tre er innhold i
    // e-posten, og `svarTil` er dessuten der kundens svar faktisk havner.
    const [avsender] = await db
      .select({ navn: schema.user.name, epost: schema.user.email })
      .from(schema.user)
      .where(eq(schema.user.id, melding.authorId));

    /**
     * ⚠️ **`withTenant`, ikke `db` direkte.** `tenants` har RLS, så et rått
     * oppslag returnerer null rader og forhandlernavnet faller stille tilbake
     * til «verkstedet» i e-posten kunden får. Fanget av testen 22.08.2026 —
     * ingenting kastet, navnet ble bare feil.
     *
     * (`user` over er en Better-Auth-tabell UTEN RLS, ADR-002, og leses derfor
     * med `db`. Forskjellen er ikke tilfeldig.)
     */
    const [forhandler] = await withTenant(db, tenantId, (tx) =>
      tx
        .select({ navn: schema.tenants.name })
        .from(schema.tenants)
        .where(eq(schema.tenants.id, tenantId)),
    );

    if (!avsender?.epost) {
      /**
       * ⚠️ Uten avsenderens e-post har kunden ingen vei tilbake — svaret ville
       * gått til `no-reply`. Da er det bedre å feile synlig enn å sende en
       * melding kunden ikke kan svare på. Treffer typisk agent-forfattere
       * (`agent:*`), som ikke er Better-Auth-brukere.
       */
      await markerFeilet('Avsenderen har ingen e-postadresse å motta svar på.');
      return;
    }

    const [traad] = await withTenant(db, tenantId, (tx) =>
      tx
        .select({ subject: schema.threads.subject })
        .from(schema.threads)
        .where(eq(schema.threads.id, melding.threadId)),
    );

    try {
      const providerId = await kanaler.epost.send({
        to: melding.externalRef ?? '',
        svarTil: avsender.epost,
        avsenderNavn: avsender.navn ?? 'Endwise',
        forhandler: forhandler?.navn ?? 'verkstedet',
        emne: traad?.subject ?? null,
        tekst: melding.body,
        // Meldings-ID-en. Stabil på tvers av retries, unik per melding.
        idempotencyKey: melding.id,
      });

      await withTenant(db, tenantId, (tx) =>
        tx
          .update(schema.messages)
          .set({ deliveryStatus: 'sent', externalId: providerId ?? null, deliveryError: null })
          .where(eq(schema.messages.id, messageId)),
      );
    } catch (error) {
      await markerFeilet(error instanceof Error ? error.message : String(error));
    }
  }

  async function assertParticipant(
    tx: Parameters<Parameters<Database['transaction']>[0]>[0],
    threadId: string,
    participantId: string,
  ) {
    const [row] = await tx
      .select({ id: schema.threadParticipants.participantId })
      .from(schema.threadParticipants)
      .where(
        and(
          eq(schema.threadParticipants.threadId, threadId),
          eq(schema.threadParticipants.participantId, participantId),
        ),
      )
      .limit(1);
    if (!row) throw new NotAParticipantError(participantId, threadId);
  }

  return {
    async createThread(input: {
      tenantId: string;
      kind: 'customer_dealer' | 'mechanic_dealer' | 'dealer_admin';
      subject?: string;
      participantIds: string[];
      /** Trådens primærkanal = svarkanalen. Default `app` (skrevet i Endwise). */
      channel?: MessageChannel;
      /** Kundens e-post/telefon i den eksterne kanalen. Kroken F6-16 henger på. */
      externalRef?: string | null;
    }) {
      return withTenant(db, input.tenantId, async (tx) => {
        const [thread] = await tx
          .insert(schema.threads)
          .values({
            tenantId: input.tenantId,
            kind: input.kind,
            subject: input.subject ?? null,
            channel: input.channel ?? 'app',
            externalRef: input.externalRef ?? null,
          })
          .returning();
        if (!thread) throw new Error('Tråden ble ikke opprettet');

        await tx.insert(schema.threadParticipants).values(
          input.participantIds.map((participantId) => ({
            tenantId: input.tenantId,
            threadId: thread.id,
            participantId,
          })),
        );

        return thread;
      });
    },

    /**
     * Skriv melding + push den ut. Rekkefølgen er viktig: eventet publiseres
     * ETTER at meldingen er skrevet, ellers ville en klient kunne rekke å be om
     * en melding som ikke finnes ennå.
     */
    async postMessage(input: {
      tenantId: string;
      threadId: string;
      authorId: string;
      body: string;
      /**
       * Hvor meldingen kom inn / gikk ut.
       *
       * ⚠️ Default er `app`, ikke trådens kanal. En melding skrevet i panelet
       * ER en app-melding, også i en e-posttråd — helt til utsendingen faktisk
       * skjer over e-post (F6-16). Å arve trådens kanal her ville betydd at
       * indikatoren løy om noe som ennå ikke er sendt.
       */
      channel?: MessageChannel;
      direction?: MessageDirection;
      /** Leverandørens ID. Idempotensnøkkel for innkommende webhooks (F6-27). */
      externalId?: string | null;
      externalRef?: string | null;
    }) {
      const message = await withTenant(db, input.tenantId, async (tx) => {
        await assertParticipant(tx, input.threadId, input.authorId);

        /**
         * F6-26 — trådens kanal avgjør om meldingen skal UT et sted.
         *
         * ⚠️ Leses i samme transaksjon som innsettingen. Hentet vi den utenfor,
         * kunne kanalen rukket å endre seg mellom oppslag og skriving, og raden
         * ville sagt én ting mens utsendingen gjorde en annen.
         */
        const [thread] = await tx
          .select({
            channel: schema.threads.channel,
            externalRef: schema.threads.externalRef,
          })
          .from(schema.threads)
          .where(eq(schema.threads.id, input.threadId));

        /**
         * ⛔ Sendes bare når kanalen er e-post OG vi har en adresse.
         *
         * En e-posttråd uten `external_ref` er en tråd ingen kan nås på. Da er
         * riktig oppførsel å skrive meldingen som en vanlig app-melding — ikke
         * å markere den `pending` for en levering som aldri kan skje.
         */
        const eksternKanal = input.channel ?? thread?.channel ?? 'app';
        const mottaker = input.externalRef ?? thread?.externalRef ?? null;
        const skalSendes =
          input.direction !== 'inbound' && eksternKanal === 'email' && Boolean(mottaker);

        const [created] = await tx
          .insert(schema.messages)
          .values({
            tenantId: input.tenantId,
            threadId: input.threadId,
            authorId: input.authorId,
            body: input.body,
            /**
             * ⚠️ Kanalen på raden er hva som FAKTISK skjer med denne meldingen,
             * ikke hva tråden ønsker seg. Kan den ikke sendes, er den en
             * app-melding — og badgen i innboksen sier det samme som virkeligheten.
             */
            channel: skalSendes ? 'email' : (input.channel ?? 'app'),
            direction: input.direction ?? 'outbound',
            externalId: input.externalId ?? null,
            externalRef: skalSendes ? mottaker : (input.externalRef ?? null),
            deliveryStatus: skalSendes ? 'pending' : null,
          })
          .returning();
        if (!created) throw new Error('Meldingen ble ikke skrevet');

        await tx
          .update(schema.threads)
          .set({ lastMessageAt: created.createdAt })
          .where(eq(schema.threads.id, input.threadId));

        return created;
      });

      // Ett event per mottaker, slik at `audienceId` kan filtrere i SSE-strømmen.
      const participants = await withTenant(db, input.tenantId, (tx) =>
        tx
          .select({ participantId: schema.threadParticipants.participantId })
          .from(schema.threadParticipants)
          .where(eq(schema.threadParticipants.threadId, input.threadId)),
      );

      for (const p of participants) {
        if (p.participantId === input.authorId) continue; // ikke varsle deg selv
        await publishEvent(db, {
          tenantId: input.tenantId,
          type: 'message.created',
          subjectId: input.threadId,
          audienceId: p.participantId,
          // Ingen meldingstekst i payloaden — klienten henter meldingen gjennom RLS.
          payload: { threadId: input.threadId, messageId: message.id, authorId: input.authorId },
        });
      }

      /**
       * F6-26 — utsendingen skjer ETTER at raden og eventene er på plass.
       *
       * ⛔ Rekkefølgen er ikke tilfeldig: **det brukeren skrev skal aldri gå
       * tapt i en nettverksfeil.** Sendte vi først, ville en Resend-timeout
       * betydd at meldingen forsvant fra skjermen selv om den kanskje gikk.
       * Nå er den alltid i tråden, og statusen sier hva som skjedde med den.
       *
       * ⚠️ Await-et, ikke i bakgrunnen. Den som trykker «send» skal få vite om
       * det gikk før hen går videre. En bakgrunnskø her ville krevd Workflows
       * (F3-04-mønsteret) og et sted å vise resultatet i etterkant — verdt det
       * når volumet krever det, unødvendig for én e-post.
       */
      if (message.deliveryStatus === 'pending') {
        await leverEpost(input.tenantId, message.id);
      }

      // Les raden på nytt: statusen er satt av leveringen over.
      return message.deliveryStatus === 'pending'
        ? ((await hentMelding(input.tenantId, message.id)) ?? message)
        : message;
    },

    /**
     * F6-26 — send en FEILET melding på nytt.
     *
     * Kun `failed` og `pending` kan plukkes opp — se `leverEpost`. En melding
     * som allerede er `sent` kan ikke sendes igjen ved et uhell, og det er
     * hele poenget: kunden skal ikke få den samme meldingen to ganger fordi
     * noen klikket to ganger.
     */
    async resendMessage(input: { tenantId: string; messageId: string; readerId: string }) {
      const melding = await hentMelding(input.tenantId, input.messageId);
      if (!melding) throw new Error('Fant ikke meldingen');

      await withTenant(db, input.tenantId, (tx) =>
        assertParticipant(tx, melding.threadId, input.readerId),
      );

      await leverEpost(input.tenantId, input.messageId);
      return (await hentMelding(input.tenantId, input.messageId)) ?? melding;
    },

    /** Meldingene i en tråd. Krever deltakelse. */
    async listMessages(tenantId: string, threadId: string, readerId: string) {
      return withTenant(db, tenantId, async (tx) => {
        await assertParticipant(tx, threadId, readerId);
        return tx
          .select()
          .from(schema.messages)
          .where(eq(schema.messages.threadId, threadId))
          .orderBy(schema.messages.createdAt);
      });
    },

    /** Innboksen: mine tråder + uleste-telling. */
    async listThreads(tenantId: string, participantId: string) {
      return withTenant(db, tenantId, (tx) =>
        tx
          .select({
            id: schema.threads.id,
            kind: schema.threads.kind,
            subject: schema.threads.subject,
            lastMessageAt: schema.threads.lastMessageAt,
            /** Svarkanalen. Se `messageChannelEnum`. */
            channel: schema.threads.channel,
            /**
             * Kanalen SISTE melding kom på — ikke nødvendigvis trådens egen.
             *
             * Forskjellen er hele poenget for den som sitter i innboksen: en
             * e-posttråd der siste melding kom som SMS betyr at kunden byttet
             * vei, og at svaret kanskje bør følge etter.
             */
            sisteKanal: sql<string>`coalesce((
              select m.channel from messages m
              where m.thread_id = ${schema.threads.id}
              order by m.created_at desc limit 1
            ), ${schema.threads.channel})`,
            unread: sql<number>`(
              select count(*)::int from messages m
              where m.thread_id = ${schema.threads.id}
                and m.author_id <> ${participantId}
                and (${schema.threadParticipants.lastReadAt} is null
                     or m.created_at > ${schema.threadParticipants.lastReadAt})
            )`,
            /**
             * Hvem ELLERS er i tråden? (lagt til 08.08.2026 for F6-01)
             *
             * Innboksen viste «Samtale · Kunde» fordi den ikke hadde noe annet
             * enn emnet å skrive. Motpartene er det innboksen egentlig sorterer
             * etter i hodet på den som leser: du husker Kari, ikke emnefeltet.
             *
             * Bare IDer her — navnene slås opp av `directory.participants`, som
             * er den ene ruta som har lov til å oversette en ID til et navn.
             */
            motparter: sql<string[]>`coalesce((
              select array_agg(tp.participant_id)
              from thread_participants tp
              where tp.thread_id = ${schema.threads.id}
                and tp.participant_id <> ${participantId}
            ), '{}')`,
          })
          .from(schema.threads)
          .innerJoin(
            schema.threadParticipants,
            and(
              eq(schema.threadParticipants.threadId, schema.threads.id),
              eq(schema.threadParticipants.participantId, participantId),
            ),
          )
          .orderBy(desc(schema.threads.lastMessageAt)),
      );
    },

    /**
     * F6-05 — Legg mennesker inn i en tråd agenten allerede står i.
     * Idempotent: eskalerer agenten to ganger, dupliseres ikke deltakerne.
     */
    async addParticipants(tenantId: string, threadId: string, participantIds: string[]) {
      if (participantIds.length === 0) return;
      return withTenant(db, tenantId, (tx) =>
        tx
          .insert(schema.threadParticipants)
          .values(
            participantIds.map((participantId) => ({
              tenantId,
              threadId,
              participantId,
            })),
          )
          .onConflictDoNothing({
            target: [schema.threadParticipants.threadId, schema.threadParticipants.participantId],
          }),
      );
    },

    /**
     * F6-05 — Systemmelding fra agenten. Går utenom deltaker-sjekken fordi
     * agenten skriver PÅ VEGNE AV systemet i det øyeblikket den gir fra seg
     * tråden — men den er fortsatt tenant-skopet og RLS gjelder.
     */
    async postSystemMessage(input: {
      tenantId: string;
      threadId: string;
      authorId: string;
      body: string;
    }) {
      return withTenant(db, input.tenantId, async (tx) => {
        const [created] = await tx
          .insert(schema.messages)
          .values({
            tenantId: input.tenantId,
            threadId: input.threadId,
            authorId: input.authorId,
            body: input.body,
          })
          .returning();

        await tx
          .update(schema.threads)
          .set({ lastMessageAt: new Date() })
          .where(eq(schema.threads.id, input.threadId));

        return created;
      });
    },

    async markRead(tenantId: string, threadId: string, participantId: string) {
      return withTenant(db, tenantId, async (tx) => {
        await assertParticipant(tx, threadId, participantId);
        await tx
          .update(schema.threadParticipants)
          .set({ lastReadAt: new Date() })
          .where(
            and(
              eq(schema.threadParticipants.threadId, threadId),
              eq(schema.threadParticipants.participantId, participantId),
            ),
          );
      });
    },

    /**
     * F5-11 — alle forhandler↔Endwise-tråder, på tvers av tenants.
     *
     * Kjører under `withPlatformAdmin`. RLS slipper KUN `dealer_admin` gjennom.
     * Deltakelse kreves ikke — Endwise er mottakeren, ikke en forhåndsvalgt
     * deltaker. `listThreads` er urørt.
     */
    async listPlatformSupportThreads(readerId: string) {
      const rader = await withPlatformAdmin(db, (tx) =>
        tx
          .select({
            id: schema.threads.id,
            tenantId: schema.threads.tenantId,
            tenantName: schema.tenants.name,
            tenantSlug: schema.tenants.slug,
            kind: schema.threads.kind,
            subject: schema.threads.subject,
            lastMessageAt: schema.threads.lastMessageAt,
            channel: schema.threads.channel,
            sisteTekst: sql<string>`coalesce((
              select m.body from messages m
              where m.thread_id = ${schema.threads.id}
                and m.tenant_id = ${schema.threads.tenantId}
              order by m.created_at desc limit 1
            ), ${schema.threads.subject}, '')`,
            unread: sql<boolean>`coalesce((
              select m.author_id <> ${readerId}
                and (tp.last_read_at is null or m.created_at > tp.last_read_at)
              from messages m
              left join thread_participants tp
                on tp.thread_id = ${schema.threads.id}
               and tp.participant_id = ${readerId}
              where m.thread_id = ${schema.threads.id}
                and m.tenant_id = ${schema.threads.tenantId}
              order by m.created_at desc
              limit 1
            ), false)`,
          })
          .from(schema.threads)
          .innerJoin(schema.tenants, eq(schema.tenants.id, schema.threads.tenantId))
          .where(eq(schema.threads.kind, 'dealer_admin'))
          .orderBy(desc(schema.threads.lastMessageAt)),
      );

      if (rader.length === 0) return [];

      const tradIder = rader.map((t) => t.id);
      const deltakere = await withPlatformAdmin(db, (tx) =>
        tx
          .select({
            threadId: schema.threadParticipants.threadId,
            tenantId: schema.threadParticipants.tenantId,
            participantId: schema.threadParticipants.participantId,
          })
          .from(schema.threadParticipants)
          .where(inArray(schema.threadParticipants.threadId, tradIder)),
      );

      const idsPerTenant = new Map<string, string[]>();
      for (const d of deltakere) {
        const liste = idsPerTenant.get(d.tenantId) ?? [];
        liste.push(d.participantId);
        idsPerTenant.set(d.tenantId, liste);
      }

      const navnPerTenant = new Map<string, Map<string, string>>();
      for (const [tenantId, ids] of idsPerTenant) {
        navnPerTenant.set(tenantId, await navnForDealerOgEndwise(db, tenantId, ids));
      }

      return rader.map((t) => {
        const motparter = deltakere.filter((d) => d.threadId === t.id).map((d) => d.participantId);
        const navn = navnPerTenant.get(t.tenantId);
        const kontaktNavn = motparter.map((id) => navn?.get(id)).find((n) => n?.trim()) ?? null;
        return { ...t, kontaktNavn, motparter };
      });
    },

    async listPlatformSupportMessages(threadId: string) {
      const lest = await withPlatformAdmin(db, async (tx) => {
        const [traad] = await tx
          .select({ id: schema.threads.id, tenantId: schema.threads.tenantId })
          .from(schema.threads)
          .where(and(eq(schema.threads.id, threadId), eq(schema.threads.kind, 'dealer_admin')));
        if (!traad) return null;
        const meldinger = await tx
          .select()
          .from(schema.messages)
          .where(
            and(
              eq(schema.messages.threadId, threadId),
              eq(schema.messages.tenantId, traad.tenantId),
            ),
          )
          .orderBy(schema.messages.createdAt);
        return { traad, meldinger };
      });
      if (!lest) throw new PlatformSupportNotFoundError(threadId);
      const navn = await navnForDealerOgEndwise(
        db,
        lest.traad.tenantId,
        lest.meldinger.map((m) => m.authorId),
      );
      return lest.meldinger.map((m) => ({
        ...m,
        authorNavn: navn.get(m.authorId) ?? null,
      }));
    },

    /**
     * Svar i forhandlerens tråd. Oppslag via platform-admin (kind-sjekk),
     * skriving via `withTenant` på DEN tenanten — så forhandleren ser svaret
     * i sin Endwise-kanal. Ingen ny tråd, ingen Endwise-tenant.
     */
    async postPlatformSupportReply(input: { threadId: string; authorId: string; body: string }) {
      const traad = await withPlatformAdmin(db, async (tx) => {
        const [rad] = await tx
          .select({
            id: schema.threads.id,
            tenantId: schema.threads.tenantId,
          })
          .from(schema.threads)
          .where(
            and(eq(schema.threads.id, input.threadId), eq(schema.threads.kind, 'dealer_admin')),
          );
        return rad ?? null;
      });
      if (!traad) throw new PlatformSupportNotFoundError(input.threadId);

      await this.addParticipants(traad.tenantId, traad.id, [input.authorId]);
      const message = await this.postMessage({
        tenantId: traad.tenantId,
        threadId: traad.id,
        authorId: input.authorId,
        body: input.body,
      });
      await withTenant(db, traad.tenantId, (tx) =>
        tx.insert(schema.auditLog).values({
          tenantId: traad.tenantId,
          actor: input.authorId,
          action: 'platform.support.reply',
          subjectType: 'thread',
          subjectId: traad.id,
          metadata: { messageId: message.id },
        }),
      );
      return message;
    },

    async markPlatformSupportRead(input: { threadId: string; readerId: string }) {
      const traad = await withPlatformAdmin(db, async (tx) => {
        const [rad] = await tx
          .select({
            id: schema.threads.id,
            tenantId: schema.threads.tenantId,
          })
          .from(schema.threads)
          .where(
            and(eq(schema.threads.id, input.threadId), eq(schema.threads.kind, 'dealer_admin')),
          );
        return rad ?? null;
      });
      if (!traad) throw new PlatformSupportNotFoundError(input.threadId);

      await this.addParticipants(traad.tenantId, traad.id, [input.readerId]);
      return this.markRead(traad.tenantId, traad.id, input.readerId);
    },
  };
}

export type MessagesModule = ReturnType<typeof createMessagesModule>;
