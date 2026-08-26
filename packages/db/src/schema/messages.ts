import { sql } from 'drizzle-orm';
import {
  index,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { tenantPolicy } from '../rls.ts';
import { authenticatedRole } from '../roles.ts';
import { tenants } from './tenants.ts';

/**
 * Meldingstråder.
 * De tre samtale-kanalene (techstack §3) deler ÉN trådmodell. Forskjellen er
 * bare hvem som står i hver ende:
 * customer_dealer — kunde forhandler (widget)
 * mechanic_dealer — mekaniker forhandler (PWA)
 * dealer_admin — forhandler oss (support)
 */
export const threadKindEnum = pgEnum('thread_kind', [
  'customer_dealer',
  'mechanic_dealer',
  'dealer_admin',
]);

/**
 * F6-01 / F6-16 — hvor meldingen kom inn, eller gikk ut.
 * `kind` sier hvem som snakker (kunde / mekaniker / oss). Dette sier gjennom
 * Hva. De to er uavhengige: en kundesamtale kan komme inn på SMS i dag og på
 * e-post i morgen, uten at det er en annen slags samtale.
 * Dette var lenge en **prototype uten datagrunnlag**: innboksen hadde en
 * av-som-standard-bryter som viste et oppdiktet kanal-ikon, fordi `messages`
 * ikke visste hvor meldingen kom fra. Varslingsmodulen (F3-04) sender over SMS
 * og e-post, men svaret kom tilbake anonymt. Kolonnen ble lagt til.
 * Hvorfor det betyr noe i drift: **svaret må gå tilbake samme vei.** Svarer du
 * i panelet på noe kunden sendte som SMS, og svaret bare blir en app-melding,
 * får kunden det aldri. Kanalen er derfor ikke pynt — den er en rutingsopplysning.
 * app — skrevet i Endwise (panel, mekaniker-PWA)
 * sms — Twilio
 * email — e-post (Resend ut, innkommende i F6-16)
 * web — kundewidgeten på forhandlerens nettside (F4)
 */
export const messageChannelEnum = pgEnum('message_channel', ['app', 'sms', 'email', 'web']);

/**
 * Kom den inn til oss, eller gikk den ut fra oss?
 * Kanalen alene er tvetydig så snart en tråd går begge veier: to e-poster i
 * samme tråd er ikke det samme hvis den ene er kundens og den andre er vår.
 * `app`-meldinger er alltid `outbound` — de oppstår i Endwise.
 */
export const messageDirectionEnum = pgEnum('message_direction', ['inbound', 'outbound']);

/**
 * Leveringsstatus for en utgående melding på en ekstern kanal.
 * Hele grunnen til at dette er en kolonne og ikke utledet: meldingsraden
 * skrives før utsendingen forsøkes, fordi det brukeren skrev aldri skal gå tapt
 * i en nettverksfeil. Uten et statusfelt ville raden i tråden vært visuelt
 * identisk enten e-posten gikk eller ikke — og en melding som ser sendt ut,
 * men aldri gikk, er verre enn en synlig feil. Selgeren tror kunden er varslet.
 * pending — skrevet, ikke forsøkt sendt ennå
 * sending — vi har tatt eierskap og holder på. Se merknaden under.
 * sent — leverandøren har tatt imot den (`external_id` er satt)
 * failed — forsøket feilet. `delivery_error` sier hvorfor. Kan sendes på nytt
 * `sending` finnes fordi alternativet er verre. Setter man `sent` før kallet
 * (som `notifications`-dispatcheren i F3-04 gjør), vil en krasj midt i kallet
 * etterlate en rad som påstår at den gikk. Med `sending` er en strandet rad
 * synlig som strandet, og kan plukkes opp igjen — den lyver ikke.
 * NULL = ingen ekstern levering gjelder. Det er normaltilstanden: en
 * `app`-melding leveres ved å ligge i basen, og har ingenting å rapportere.
 */
export const messageDeliveryEnum = pgEnum('message_delivery', [
  'pending',
  'sending',
  'sent',
  'failed',
]);

export const threads = pgTable(
  'threads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    kind: threadKindEnum('kind').notNull(),
    subject: text('subject'),
    /**
     * Trådens primærkanal — og dermed **svarkanalen**.
     * Ikke utledet fra siste melding: en kunde som svarer fra appen én gang
     * skal ikke flytte hele samtalen bort fra e-post. Kanalen settes når tråden
     * oppstår, og endres bare bevisst.
     */
    channel: messageChannelEnum('channel').notNull().default('app'),
    /**
     * F6-16 (forberedt, ikke i bruk ennå) — trådens nøkkel i den eksterne
     * kanalen: kundens e-postadresse eller telefonnummer.
     * Dette er kroken innkommende e-post skal henges på. Når en e-post treffer
     * forhandlerens adresse, må den ende i riktig tråd og ikke lage en ny hver
     * gang — `(tenant_id, channel, external_ref)` er det oppslaget.
     * Inneholder persondata (e-post/telefon). Beskyttet av samme RLS som
     * resten av tabellen; ingen egen behandling, men verdt å vite at raden ikke
     * er «bare metadata».
     */
    externalRef: text('external_ref'),
    /** Denorm: sorterer innboksen uten å joine mot messages. */
    lastMessageAt: timestamp('last_message_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index('threads_tenant_last_idx').on(t.tenantId, t.lastMessageAt),
    // «hvilken tråd hører denne innkommende e-posten til?» skal være ett
    // indeksoppslag, ikke en scan over alle trådene til forhandleren.
    index('threads_tenant_channel_ref_idx').on(t.tenantId, t.channel, t.externalRef),
    tenantPolicy('threads', t.tenantId),
    /**
     * SELECT-only for Endwise-admin. `withPlatformAdmin` åpner denne.
     * Kun `dealer_admin` (forhandlerEndwise). customer_dealer og
     * mechanic_dealer forblir usynlige — det er samtaler vi ikke skal lese.
     */
    pgPolicy('threads_platform_admin_support_read', {
      as: 'permissive',
      for: 'select',
      to: authenticatedRole,
      using: sql`current_setting('app.platform_admin', true) = 'on' AND ${t.kind} = 'dealer_admin'`,
    }),
    pgPolicy('threads_platform_inspect_read', {
      as: 'permissive',
      for: 'select',
      to: authenticatedRole,
      using: sql`${t.tenantId} = nullif(current_setting('app.platform_inspect', true), '')::uuid AND ${t.kind} = 'dealer_admin'`,
    }),
  ],
).enableRLS();

/**
 * Hvem er med i tråden.
 * Dette er tilgangskontrollen på meldingsnivå: RLS holder tenant-grensen, men
 * Innenfor en tenant skal ikke hvilken som helst ansatt kunne lese hvilken som
 * helst kundesamtale. Deltakelse er kravet.
 */
export const threadParticipants = pgTable(
  'thread_participants',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => threads.id, { onDelete: 'cascade' }),
    /** Better-Auth-bruker-ID, eller 'agent:<navn>' for en AI-førstelinje (F6-13). */
    participantId: text('participant_id').notNull(),
    /** Sist leste melding. Driver uleste-tellingen. */
    lastReadAt: timestamp('last_read_at', { withTimezone: true }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    primaryKey({ columns: [t.threadId, t.participantId] }),
    index('thread_participants_participant_idx').on(t.tenantId, t.participantId),
    tenantPolicy('thread_participants', t.tenantId),
    pgPolicy('thread_participants_platform_admin_support_read', {
      as: 'permissive',
      for: 'select',
      to: authenticatedRole,
      using: sql`current_setting('app.platform_admin', true) = 'on' AND EXISTS (
        SELECT 1 FROM threads th WHERE th.id = ${t.threadId} AND th.kind = 'dealer_admin'
        AND th.tenant_id = ${t.tenantId}
      )`,
    }),
    pgPolicy('thread_participants_platform_inspect_read', {
      as: 'permissive',
      for: 'select',
      to: authenticatedRole,
      using: sql`${t.tenantId} = nullif(current_setting('app.platform_inspect', true), '')::uuid AND EXISTS (
        SELECT 1 FROM threads th WHERE th.id = ${t.threadId} AND th.kind = 'dealer_admin'
        AND th.tenant_id = ${t.tenantId}
      )`,
    }),
  ],
).enableRLS();

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => threads.id, { onDelete: 'cascade' }),
    /** Bruker-ID, eller 'agent:<navn>'. En agent er bare en deltaker til (F6-05). */
    authorId: text('author_id').notNull(),
    body: text('body').notNull(),
    /** Hvor denne meldingen kom inn / gikk ut. Se `messageChannelEnum`. */
    channel: messageChannelEnum('channel').notNull().default('app'),
    /** Inn til oss eller ut fra oss. Se `messageDirectionEnum`. */
    direction: messageDirectionEnum('direction').notNull().default('outbound'),
    /**
     * F6-16 (forberedt) — leverandørens egen ID: Resend/Twilio message-id, eller
     * en e-posts `Message-ID`.
     * Dette er **idempotensnøkkelen for innkommende meldinger**. En webhook
     * leveres mer enn én gang; uten denne blir hver ny levering en ny melding i
     * tråden. Unik per tenant (NULL teller som distinkt i Postgres, så
     * app-meldinger rammes ikke).
     */
    externalId: text('external_id'),
    /** Motpartens adresse i den eksterne kanalen (e-post/telefon). Persondata. */
    externalRef: text('external_ref'),
    /**
     * Se `messageDeliveryEnum`. NULL for app-meldinger.
     * Dette feltet er idempotensvakten. Utsendingen tar eierskap med en
     * betinget `UPDATE … WHERE delivery_status IN ('pending','failed')`; treffer
     * den null rader, holder noen andre allerede på, og vi sender ikke.
     */
    deliveryStatus: messageDeliveryEnum('delivery_status'),
    /** Hvorfor det feilet. Vises til brukeren — hold den lesbar. */
    deliveryError: text('delivery_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index('messages_thread_created_idx').on(t.threadId, t.createdAt),
    uniqueIndex('messages_tenant_external_uidx').on(t.tenantId, t.externalId),
    tenantPolicy('messages', t.tenantId),
    pgPolicy('messages_platform_admin_support_read', {
      as: 'permissive',
      for: 'select',
      to: authenticatedRole,
      using: sql`current_setting('app.platform_admin', true) = 'on' AND EXISTS (
        SELECT 1 FROM threads th WHERE th.id = ${t.threadId} AND th.kind = 'dealer_admin'
        AND th.tenant_id = ${t.tenantId}
      )`,
    }),
    pgPolicy('messages_platform_inspect_read', {
      as: 'permissive',
      for: 'select',
      to: authenticatedRole,
      using: sql`${t.tenantId} = nullif(current_setting('app.platform_inspect', true), '')::uuid AND EXISTS (
        SELECT 1 FROM threads th WHERE th.id = ${t.threadId} AND th.kind = 'dealer_admin'
        AND th.tenant_id = ${t.tenantId}
      )`,
    }),
  ],
).enableRLS();

export type Thread = typeof threads.$inferSelect;
export type NewThread = typeof threads.$inferInsert;
export type ThreadParticipant = typeof threadParticipants.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
