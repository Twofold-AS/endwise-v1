import { and, asc, desc, eq, gte, inArray, lt, schema, withTenant } from '@endwise/db';
import { createBillingService } from '@endwise/modules/billing';
import {
  lesAvatar,
  mekanikerStatusVisning,
  TOM_AVATAR,
  tellerSomBelastning,
  visningForTraadtype,
  visningsnavn,
} from '@endwise/modules/profil';
import { z } from 'zod';
import { protectedProcedure, router } from '../init.ts';

/**
 * F6-17 — «DETALJER»-PANELET i innboksen: hva handler denne samtalen om?
 *
 * ── Hvorfor én rute og ikke fem ───────────────────────────────────────────
 * Panelet viser ulikt innhold per trådtype, men det er ÉN skjerm med ÉN
 * lastetilstand. Fem separate kall ville gitt fem spinnere i en 320px kolonne,
 * og klienten måtte visst hvilke av dem som gjaldt — altså kjent trådtypen før
 * den spurte. Serveren vet det allerede. Svaret er derfor en diskriminert union
 * på `type`, og klienten bare tegner det den får.
 *
 * ── ⛔ TILGANG: to sperrer, som resten av meldingslaget ───────────────────
 *   1. RLS  — alt går gjennom `withTenant`. Ingen annen forhandlers data.
 *   2. DELTAKELSE — `assertDeltaker` under. Uten den kunne en ansatt hos samme
 *      forhandler slått opp kundekortet til en samtale hun ikke er med i, ved
 *      å gjette en tråd-ID. Det er ikke en tenant-lekkasje, men det er
 *      fortsatt en lekkasje (samme resonnement som `listMessages`).
 *
 * ── Personvern ────────────────────────────────────────────────────────────
 * For en kundetråd er dette forhandlerens EGEN kunde, og strukturert data de
 * allerede eier: kontaktinfo, kjøretøy, saker. Ingenting hentes på tvers av
 * tenants, og Endwise leser fortsatt aldri meldingsinnhold — panelet viser
 * emner og tidspunkter fra kundens tråder, ikke meldingstekst.
 */

/** Hvor mange rader hver seksjon maks viser. Panelet er 320px, ikke en rapport. */
const MAKS_RADER = 5;

export const inboxContextRouter = router({
  forThread: protectedProcedure
    .input(z.object({ threadId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      return withTenant(ctx.db, ctx.tenantId, async (tx) => {
        // ── 1. Finnes tråden, og er DU med i den? ──────────────────────
        const [traad] = await tx
          .select({
            id: schema.threads.id,
            kind: schema.threads.kind,
            subject: schema.threads.subject,
            channel: schema.threads.channel,
            externalRef: schema.threads.externalRef,
          })
          .from(schema.threads)
          .where(eq(schema.threads.id, input.threadId));
        if (!traad) return { type: 'ukjent' as const, grunn: 'ikke_funnet' as const };

        const [meg] = await tx
          .select({ id: schema.threadParticipants.participantId })
          .from(schema.threadParticipants)
          .where(
            and(
              eq(schema.threadParticipants.threadId, traad.id),
              eq(schema.threadParticipants.participantId, ctx.userId),
            ),
          );
        if (!meg) return { type: 'ukjent' as const, grunn: 'ikke_deltaker' as const };

        // Motpartene: alle deltakere som ikke er meg og ikke er en agent.
        const deltakere = await tx
          .select({ id: schema.threadParticipants.participantId })
          .from(schema.threadParticipants)
          .where(eq(schema.threadParticipants.threadId, traad.id));
        const motparter = deltakere
          .map((d) => d.id)
          .filter((id) => id !== ctx.userId && !id.startsWith('agent:'));

        /* ══ ENDWISE-SUPPORT → konto og abonnement ═══════════════════════ */
        if (traad.kind === 'dealer_admin') {
          const [tenant] = await tx
            .select({ name: schema.tenants.name, kind: schema.tenants.kind })
            .from(schema.tenants)
            .where(eq(schema.tenants.id, ctx.tenantId));

          // ⚠️ Utenfor `tx`: billing-tjenesten åpner sin egen tenant-transaksjon.
          const abonnement = await createBillingService(ctx.db)
            .getState(ctx.tenantId)
            .catch(() => null);

          return {
            type: 'konto' as const,
            tenantNavn: tenant?.name ?? null,
            tenantKind: tenant?.kind ?? 'live',
            planKey: abonnement?.planKey ?? null,
            status: abonnement?.status ?? null,
            /** Kun AKTIVE moduler. En liste med avslåtte er støy her. */
            moduler: (abonnement?.modules ?? []).filter((m) => m.enabled).map((m) => m.key),
            currentPeriodEnd: abonnement?.currentPeriodEnd ?? null,
          };
        }

        /* ══ INTERN TRÅD → motpartens arbeidsdag ═════════════════════════ */
        if (traad.kind === 'mechanic_dealer') {
          if (motparter.length === 0) {
            return { type: 'ukjent' as const, grunn: 'ingen_motpart' as const };
          }

          const [mek] = await tx
            .select()
            .from(schema.mechanics)
            .where(
              and(
                eq(schema.mechanics.tenantId, ctx.tenantId),
                inArray(schema.mechanics.userId, motparter),
              ),
            );
          if (!mek) return { type: 'ukjent' as const, grunn: 'ingen_mekanikerprofil' as const };

          /**
           * ⛔ Kallenavn (F7-06). `mechanic_dealer` ER en intern tråd, så her
           * gjelder samme visning som meldingene i den — ellers ville panelet
           * sagt «Ola Mekaniker» mens boblene ved siden av sier
           * «Skiftenøkkelen», og leseren måtte gjette at det er samme person.
           *
           * `visningForTraadtype` avgjør, ikke en hardkodet 'intern': da følger
           * panelet regelen automatisk hvis flere trådtyper kommer til.
           */
          const [profil] = mek.userId
            ? await tx
                .select({ nickname: schema.memberProfiles.nickname })
                .from(schema.memberProfiles)
                .where(
                  and(
                    eq(schema.memberProfiles.tenantId, ctx.tenantId),
                    eq(schema.memberProfiles.userId, mek.userId),
                  ),
                )
            : [];

          // Dagens vindu. Samme regnestykke som «Min dag» (F7).
          const fra = new Date();
          fra.setHours(0, 0, 0, 0);
          const til = new Date(fra);
          til.setDate(til.getDate() + 1);

          const jobber = await tx
            .select({
              id: schema.bookings.id,
              status: schema.bookings.status,
              startsAt: schema.bookings.startsAt,
              endsAt: schema.bookings.endsAt,
              regNumber: schema.vehicles.regNumber,
              serviceName: schema.services.name,
            })
            .from(schema.bookings)
            .leftJoin(schema.vehicles, eq(schema.vehicles.id, schema.bookings.vehicleId))
            .leftJoin(
              schema.serviceVersions,
              eq(schema.serviceVersions.id, schema.bookings.serviceVersionId),
            )
            .leftJoin(schema.services, eq(schema.services.id, schema.serviceVersions.serviceId))
            .where(
              and(
                eq(schema.bookings.mechanicId, mek.id),
                gte(schema.bookings.startsAt, fra),
                lt(schema.bookings.startsAt, til),
              ),
            )
            .orderBy(asc(schema.bookings.startsAt));

          const kompetanse = await tx
            .select({
              skillKey: schema.mechanicSkills.skillKey,
              level: schema.mechanicSkills.level,
              certificationExpiresAt: schema.mechanicSkills.certificationExpiresAt,
            })
            .from(schema.mechanicSkills)
            .where(eq(schema.mechanicSkills.mechanicId, mek.id));

          /**
           * Belastning = jobber i dag mot kapasitet.
           *
           * ⚠️ Kapasitet er «samtidige jobber», ikke «jobber per dag». Tallet er
           * derfor en indikasjon, ikke en fasit — og det står slik i UI-et. Å
           * regne det om til en prosent ville gitt tallet en presisjon det ikke
           * har.
           */
          /**
           * F6-19 — mekanikerens egne avatarvalg.
           *
           * ⚠️ Uten dette ville panelet tegnet ansiktet fra seeden mens tråden
           * ved siden av tegnet det mekanikeren faktisk har valgt — samme
           * person, to ansikter, 300 piksler fra hverandre.
           *
           * ⛔ `user_preferences` har ingen RLS. Isolasjonen kommer fra at
           * `mek` allerede ER hentet tenant-skopet: vi slår opp valgene til den
           * mekanikeren, ikke til en ID fra klienten.
           */
          const [avatarRad] = mek.userId
            ? await ctx.db
                .select({
                  avatarShape: schema.userPreferences.avatarShape,
                  avatarHumor: schema.userPreferences.avatarHumor,
                  avatarHue: schema.userPreferences.avatarHue,
                  avatarTone: schema.userPreferences.avatarTone,
                })
                .from(schema.userPreferences)
                .where(eq(schema.userPreferences.userId, mek.userId))
                .catch(() => [])
            : [];

          const liveJobber = jobber.filter((j) => tellerSomBelastning(j.status)).length;
          const vis = mekanikerStatusVisning({
            aktiv: mek.active,
            jobberIDag: liveJobber,
            kapasitet: mek.capacity,
          });

          return {
            type: 'mekaniker' as const,
            mekanikerId: mek.id,
            /** ⛔ Seeden er `mechanics.id` — samme som innboksen bruker. */
            avatar: mek.userId ? lesAvatar(avatarRad ?? null) : TOM_AVATAR,
            /** Internt visningsnavn — kallenavn hvis satt. Se over. */
            navn: visningsnavn(
              { navn: mek.name, kallenavn: profil?.nickname ?? null },
              visningForTraadtype(traad.kind),
            ),
            aktiv: mek.active,
            kapasitet: mek.capacity,
            jobberIDag: jobber.length,
            jobber,
            kompetanse,
            ...vis,
          };
        }

        /* ══ KUNDETRÅD → kundekortet i kortform ══════════════════════════ */
        // Kunden finnes på to måter: som innlogget deltaker (`customers.user_id`)
        // eller — for e-post/SMS-tråder — via `threads.external_ref`. Den andre
        // veien er nettopp poenget med `external_ref` (F6-16).
        let kunde: typeof schema.customers.$inferSelect | undefined;

        if (motparter.length > 0) {
          [kunde] = await tx
            .select()
            .from(schema.customers)
            .where(
              and(
                eq(schema.customers.tenantId, ctx.tenantId),
                inArray(schema.customers.userId, motparter),
              ),
            );
        }
        if (!kunde && traad.externalRef) {
          const felt = traad.channel === 'sms' ? schema.customers.phone : schema.customers.email;
          [kunde] = await tx
            .select()
            .from(schema.customers)
            .where(and(eq(schema.customers.tenantId, ctx.tenantId), eq(felt, traad.externalRef)));
        }
        if (!kunde) return { type: 'ukjent' as const, grunn: 'ingen_kunde' as const };

        const kjoretoy = await tx
          .select({
            id: schema.vehicles.id,
            type: schema.vehicles.type,
            regNumber: schema.vehicles.regNumber,
            make: schema.vehicles.make,
            model: schema.vehicles.model,
            inspectionDue: schema.vehicles.inspectionDue,
          })
          .from(schema.vehicles)
          .where(eq(schema.vehicles.customerId, kunde.id))
          .orderBy(asc(schema.vehicles.regNumber));

        const saker = await tx
          .select({
            id: schema.bookings.id,
            status: schema.bookings.status,
            startsAt: schema.bookings.startsAt,
            regNumber: schema.vehicles.regNumber,
            serviceName: schema.services.name,
          })
          .from(schema.bookings)
          .leftJoin(schema.vehicles, eq(schema.vehicles.id, schema.bookings.vehicleId))
          .leftJoin(
            schema.serviceVersions,
            eq(schema.serviceVersions.id, schema.bookings.serviceVersionId),
          )
          .leftJoin(schema.services, eq(schema.services.id, schema.serviceVersions.serviceId))
          .where(eq(schema.bookings.customerId, kunde.id))
          .orderBy(desc(schema.bookings.startsAt))
          .limit(20);

        /**
         * ⚠️ ANDRE tråder med samme kunde — emne og tidspunkt, ALDRI tekst.
         * Panelet skal si «dere har snakket sammen før», ikke gjengi hva som
         * ble sagt. Vil man lese, åpner man tråden.
         */
        const andreTraader = kunde.userId
          ? await tx
              .select({
                id: schema.threads.id,
                subject: schema.threads.subject,
                channel: schema.threads.channel,
                lastMessageAt: schema.threads.lastMessageAt,
              })
              .from(schema.threads)
              .innerJoin(
                schema.threadParticipants,
                and(
                  eq(schema.threadParticipants.threadId, schema.threads.id),
                  eq(schema.threadParticipants.participantId, kunde.userId),
                ),
              )
              .orderBy(desc(schema.threads.lastMessageAt))
              .limit(MAKS_RADER + 1)
          : [];

        const AAPNE = new Set(['draft', 'confirmed', 'in_progress']);
        return {
          type: 'kunde' as const,
          kunde: {
            id: kunde.id,
            navn: kunde.name,
            epost: kunde.email,
            telefon: kunde.phone,
            kilde: kunde.source,
            kundeSiden: kunde.createdAt,
            harInnlogging: Boolean(kunde.userId),
          },
          kjoretoy,
          apneSaker: saker.filter((s) => AAPNE.has(s.status)),
          historikk: saker.filter((s) => !AAPNE.has(s.status)).slice(0, MAKS_RADER),
          andreTraader: andreTraader.filter((t) => t.id !== traad.id).slice(0, MAKS_RADER),
        };
      });
    }),
});
