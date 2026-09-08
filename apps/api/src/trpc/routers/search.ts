import { and, desc, eq, ilike, inArray, isNull, or, schema, withTenant } from '@endwise/db';
import {
  filtrerTommeGrupper,
  normaliserSok,
  SOK_LIMIT,
  type SokGruppe,
  type SokTreff,
} from '@endwise/modules/sok';
import { z } from 'zod';
import { protectedProcedure, router } from '../init.ts';

/**
 * F5-13 — globalt søk mot eksisterende CRM-tabeller.
 * Ingen fake treff. Tom gruppe utelates. Kort spørring = tomt svar.
 */

function like(q: string): string {
  return `%${q}%`;
}

function treff(id: string, tittel: string, href: string, under: string | null = null): SokTreff {
  return { id, tittel, under, href };
}

export const searchRouter = router({
  global: protectedProcedure
    .input(z.object({ q: z.string().max(120) }))
    .query(async ({ ctx, input }): Promise<{ q: string | null; grupper: SokGruppe[] }> => {
      const q = normaliserSok(input.q);
      if (!q) return { q: null, grupper: [] };

      const monster = like(q);

      const kjerne = await withTenant(ctx.db, ctx.tenantId, async (tx) => {
        const kunder = await tx
          .select({
            id: schema.customers.id,
            name: schema.customers.name,
            email: schema.customers.email,
            phone: schema.customers.phone,
            userId: schema.customers.userId,
          })
          .from(schema.customers)
          .where(
            and(
              eq(schema.customers.tenantId, ctx.tenantId),
              or(
                ilike(schema.customers.name, monster),
                ilike(schema.customers.email, monster),
                ilike(schema.customers.phone, monster),
              ),
            ),
          )
          .orderBy(schema.customers.name)
          .limit(SOK_LIMIT);

        const jobber = await tx
          .select({
            id: schema.bookings.id,
            customerName: schema.customers.name,
            serviceName: schema.services.name,
            regNumber: schema.vehicles.regNumber,
            startsAt: schema.bookings.startsAt,
          })
          .from(schema.bookings)
          .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
          .leftJoin(schema.vehicles, eq(schema.vehicles.id, schema.bookings.vehicleId))
          .innerJoin(
            schema.serviceVersions,
            eq(schema.serviceVersions.id, schema.bookings.serviceVersionId),
          )
          .innerJoin(schema.services, eq(schema.services.id, schema.serviceVersions.serviceId))
          .where(
            and(
              eq(schema.bookings.tenantId, ctx.tenantId),
              or(
                ilike(schema.customers.name, monster),
                ilike(schema.vehicles.regNumber, monster),
                ilike(schema.bookings.notes, monster),
                ilike(schema.services.name, monster),
              ),
            ),
          )
          .orderBy(desc(schema.bookings.startsAt))
          .limit(SOK_LIMIT);

        const kjoretoy = await tx
          .select({
            id: schema.vehicles.id,
            regNumber: schema.vehicles.regNumber,
            make: schema.vehicles.make,
            model: schema.vehicles.model,
            customerName: schema.customers.name,
          })
          .from(schema.vehicles)
          .leftJoin(schema.customers, eq(schema.customers.id, schema.vehicles.customerId))
          .where(
            and(
              eq(schema.vehicles.tenantId, ctx.tenantId),
              or(
                ilike(schema.vehicles.regNumber, monster),
                ilike(schema.vehicles.vin, monster),
                ilike(schema.vehicles.make, monster),
                ilike(schema.vehicles.model, monster),
                ilike(schema.customers.name, monster),
              ),
            ),
          )
          .orderBy(schema.vehicles.regNumber)
          .limit(SOK_LIMIT);

        const deler = await tx
          .select({
            id: schema.parts.id,
            sku: schema.parts.sku,
            name: schema.parts.name,
            category: schema.parts.category,
          })
          .from(schema.parts)
          .where(
            and(
              eq(schema.parts.tenantId, ctx.tenantId),
              or(
                ilike(schema.parts.sku, monster),
                ilike(schema.parts.name, monster),
                ilike(schema.parts.category, monster),
              ),
            ),
          )
          .orderBy(schema.parts.name)
          .limit(SOK_LIMIT);

        const tjenester = await tx
          .select({
            id: schema.services.id,
            name: schema.services.name,
            vehicleType: schema.services.vehicleType,
          })
          .from(schema.services)
          .innerJoin(
            schema.serviceVersions,
            and(
              eq(schema.serviceVersions.serviceId, schema.services.id),
              isNull(schema.serviceVersions.validTo),
            ),
          )
          .where(
            and(eq(schema.services.tenantId, ctx.tenantId), ilike(schema.services.name, monster)),
          )
          .orderBy(schema.services.name)
          .limit(SOK_LIMIT);

        const kundeUserIds = kunder.map((k) => k.userId).filter((id): id is string => Boolean(id));

        const mineRader = await tx
          .select({ threadId: schema.threadParticipants.threadId })
          .from(schema.threadParticipants)
          .where(
            and(
              eq(schema.threadParticipants.tenantId, ctx.tenantId),
              eq(schema.threadParticipants.participantId, ctx.userId),
            ),
          );
        const mineIds = mineRader.map((r) => r.threadId);

        const tradSubject =
          mineIds.length === 0
            ? []
            : await tx
                .select({
                  id: schema.threads.id,
                  subject: schema.threads.subject,
                  kind: schema.threads.kind,
                })
                .from(schema.threads)
                .where(
                  and(
                    eq(schema.threads.tenantId, ctx.tenantId),
                    inArray(schema.threads.id, mineIds),
                    ilike(schema.threads.subject, monster),
                  ),
                )
                .orderBy(desc(schema.threads.lastMessageAt))
                .limit(SOK_LIMIT);

        const tradViaKunde =
          mineIds.length === 0 || kundeUserIds.length === 0
            ? []
            : await tx
                .select({
                  id: schema.threads.id,
                  subject: schema.threads.subject,
                  kind: schema.threads.kind,
                })
                .from(schema.threads)
                .innerJoin(
                  schema.threadParticipants,
                  and(
                    eq(schema.threadParticipants.threadId, schema.threads.id),
                    inArray(schema.threadParticipants.participantId, kundeUserIds),
                  ),
                )
                .where(
                  and(
                    eq(schema.threads.tenantId, ctx.tenantId),
                    inArray(schema.threads.id, mineIds),
                  ),
                )
                .orderBy(desc(schema.threads.lastMessageAt))
                .limit(SOK_LIMIT);

        return { kunder, jobber, kjoretoy, deler, tjenester, tradSubject, tradViaKunde };
      });

      const team = await ctx.db
        .select({
          userId: schema.member.userId,
          navn: schema.user.name,
          epost: schema.user.email,
        })
        .from(schema.member)
        .innerJoin(schema.user, eq(schema.user.id, schema.member.userId))
        .where(
          and(
            eq(schema.member.organizationId, ctx.tenantId),
            or(ilike(schema.user.name, monster), ilike(schema.user.email, monster)),
          ),
        )
        .orderBy(schema.user.name)
        .limit(SOK_LIMIT);

      const hjelp = await ctx.db
        .select({
          id: schema.helpdeskArticles.id,
          slug: schema.helpdeskArticles.slug,
          title: schema.helpdeskArticles.title,
          summary: schema.helpdeskArticles.summary,
        })
        .from(schema.helpdeskArticles)
        .where(
          and(
            eq(schema.helpdeskArticles.published, true),
            or(
              ilike(schema.helpdeskArticles.title, monster),
              ilike(schema.helpdeskArticles.summary, monster),
            ),
          ),
        )
        .orderBy(desc(schema.helpdeskArticles.publishedAt))
        .limit(SOK_LIMIT);

      const tradSett = new Map<string, { id: string; subject: string | null; kind: string }>();
      for (const t of [...kjerne.tradSubject, ...kjerne.tradViaKunde]) {
        tradSett.set(t.id, t);
      }
      const forsteKunde = kjerne.kunder[0]?.name ?? null;

      const grupper = filtrerTommeGrupper([
        {
          kategori: 'Kunde',
          treff: kjerne.kunder.map((k) =>
            treff(k.id, k.name, `/kunder/${k.id}`, k.email ?? k.phone),
          ),
        },
        {
          kategori: 'Jobber',
          treff: kjerne.jobber.map((j) =>
            treff(
              j.id,
              j.serviceName || 'Jobb',
              `/bookinger/${j.id}`,
              [j.customerName, j.regNumber].filter(Boolean).join(' · ') || null,
            ),
          ),
        },
        {
          kategori: 'Innboks',
          treff: [...tradSett.values()].map((t) =>
            treff(t.id, t.subject?.trim() || 'Samtale', `/innboks/${t.id}`, forsteKunde),
          ),
        },
        {
          kategori: 'Kjøretøy',
          treff: kjerne.kjoretoy.map((v) =>
            treff(
              v.id,
              v.regNumber || [v.make, v.model].filter(Boolean).join(' ') || 'Kjøretøy',
              `/kjoretoy/${v.id}`,
              v.customerName,
            ),
          ),
        },
        {
          kategori: 'Deler',
          treff: kjerne.deler.map((p) =>
            treff(p.id, p.name, `/lager/deler?sok=${encodeURIComponent(p.sku)}`, p.sku),
          ),
        },
        {
          kategori: 'Team',
          treff: team.map((m) =>
            treff(m.userId, m.navn || m.epost, '/organisasjon?seksjon=ansatte', m.epost),
          ),
        },
        {
          kategori: 'Tjenester',
          treff: kjerne.tjenester.map((s) => treff(s.id, s.name, '/prisliste', s.vehicleType)),
        },
        {
          kategori: 'Hjelp',
          treff: hjelp.map((a) => treff(a.id, a.title, `/support/${a.slug}`, a.summary)),
        },
      ]);

      return { q, grupper };
    }),
});
