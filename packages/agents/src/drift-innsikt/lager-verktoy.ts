import type { AgentContext } from '@endwise/agent-runtime';
import { and, asc, eq, ilike, or, schema, sql, withTenant } from '@endwise/db';
import { tool } from 'ai';
import { z } from 'zod';

/**
 * F6-15 / F2-09 — lager-verktøy for agenten. **kun lesing.**
 * Sikkerhetsgjennomgangen (docs/notater/sikkerhet-lager-butikk.md, del 2)
 * pekte ut tre grenser. Denne fila håndhever alle tre — og den er bevisst
 * kjedelig, fordi det er poenget.
 * ① Aldri krysse tenant
 * Alt går gjennom `withTenant(context.db, context.tenantId, …)`. `tenantId`
 * kommer fra sesjonen via `AgentContext`, aldri fra modellen. Guardrails L2
 * stripper i tillegg tenant-lignende felter fra alt modellen sender
 * (`SCOPE_FIELDS` i packages/guardrails), og RLS er nettet under. Tre lag.
 * ② Aldri skrive
 * Det finnes ingen skrivende verktøy her, og det er ikke en forglemmelse.
 * Owasp LLM08 (Excessive Agency) er den reelle risikoen når en agent kommer
 * nær fysiske varer: «juster beholdningen til 4» er et helt annet ansvar enn
 * «hvor mange har vi?». Skriving skal gå via forslag + menneskelig bekreftelse
 * (F6-15), og den mekanismen er ikke bygget ennå. **Inntil da: ingenting.**
 * ③ felt-allowlist, ikke tabell-allowlist (LLM06)
 * `costMinor` (innkjøpspris) og `minStock` returneres aldri. Innkjøpspris
 * og marginer er forretningshemmeligheter, og guardrails L4 leter ikke etter
 * dem — den fanger API-nøkler, DB-URL-er og fødselsnummer. Ville vi gitt
 * agenten hele raden, hadde ett spørsmål holdt: «hva koster den inn?»
 * Derfor listes hver kolonne eksplisitt under. `select` uten argumenter, ellerx
 * `select({ ...schema.parts })`, ville lekket kostpris den dagen noen la til en
 * kolonne — uten at noen la merke til det.
 */

/** Kolonnene agenten får se. Ingen kostpris, ingen minimumsnivå. */
const SYNLIGE_DELEFELT = {
  sku: schema.parts.sku,
  navn: schema.parts.name,
  kategori: schema.parts.category,
  enhet: schema.parts.unit,
} as const;

export function lagerVerktoy(context: AgentContext) {
  return {
    finnDel: tool({
      description:
        'Søk i verkstedets delelager på delenummer, navn eller kategori. ' +
        'Returnerer tilgjengelig antall (på lager minus reservert). ' +
        'Inneholder IKKE innkjøpspris.',
      inputSchema: z.object({
        sok: z.string().min(1).max(80).describe('Delenummer, navn eller kategori'),
        limit: z.number().int().min(1).max(20).default(10),
      }),
      execute: async ({ sok, limit }) =>
        withTenant(context.db, context.tenantId, (tx) =>
          tx
            .select({
              ...SYNLIGE_DELEFELT,
              paaLager: sql<number>`coalesce(sum(${schema.stockLevels.onHand}), 0)::int`,
              reservert: sql<number>`coalesce(sum(${schema.stockLevels.reserved}), 0)::int`,
              tilgjengelig: sql<number>`(coalesce(sum(${schema.stockLevels.onHand}), 0) - coalesce(sum(${schema.stockLevels.reserved}), 0))::int`,
            })
            .from(schema.parts)
            .leftJoin(
              schema.stockLevels,
              and(
                eq(schema.stockLevels.partId, schema.parts.id),
                eq(schema.stockLevels.tenantId, context.tenantId),
              ),
            )
            .where(
              and(
                eq(schema.parts.tenantId, context.tenantId),
                eq(schema.parts.active, true),
                or(
                  ilike(schema.parts.sku, `%${sok}%`),
                  ilike(schema.parts.name, `%${sok}%`),
                  ilike(schema.parts.category, `%${sok}%`),
                ),
              ),
            )
            .groupBy(schema.parts.id)
            .orderBy(asc(schema.parts.sku))
            .limit(limit),
        ),
    }),

    lavtLager: tool({
      description:
        'Deler der tilgjengelig antall har falt under verkstedets minimumsnivå. ' +
        'Bruk denne når noen spør hva som må bestilles.',
      inputSchema: z.object({ limit: z.number().int().min(1).max(20).default(10) }),
      execute: async ({ limit }) =>
        withTenant(context.db, context.tenantId, async (tx) => {
          const rader = await tx
            .select({
              ...SYNLIGE_DELEFELT,
              // `minStock` brukes til sammenligningen, men returneres ikke som
              // eget felt — agenten trenger å vite hva som er lavt, ikke hvilke
              // terskler forhandleren har satt.
              tilgjengelig: sql<number>`(coalesce(sum(${schema.stockLevels.onHand}), 0) - coalesce(sum(${schema.stockLevels.reserved}), 0))::int`,
              underMinimum: sql<boolean>`(coalesce(sum(${schema.stockLevels.onHand}), 0) - coalesce(sum(${schema.stockLevels.reserved}), 0)) < coalesce(${schema.parts.minStock}, 0)`,
            })
            .from(schema.parts)
            .leftJoin(
              schema.stockLevels,
              and(
                eq(schema.stockLevels.partId, schema.parts.id),
                eq(schema.stockLevels.tenantId, context.tenantId),
              ),
            )
            .where(and(eq(schema.parts.tenantId, context.tenantId), eq(schema.parts.active, true)))
            .groupBy(schema.parts.id)
            .limit(200);

          return rader.filter((r) => r.underMinimum).slice(0, limit);
        }),
    }),

    lagerLokasjoner: tool({
      description: 'Lokasjonene (hyller, rom, biler) verkstedet lagrer deler på.',
      inputSchema: z.object({}),
      execute: async () =>
        withTenant(context.db, context.tenantId, (tx) =>
          tx
            .select({ kode: schema.stockLocations.code, navn: schema.stockLocations.name })
            .from(schema.stockLocations)
            .where(
              and(
                eq(schema.stockLocations.tenantId, context.tenantId),
                eq(schema.stockLocations.active, true),
              ),
            )
            .limit(50),
        ),
    }),
  };
}
