import { type Database, eq, schema, withTenant } from '@endwise/db';
import { erPlattformTenant } from '@endwise/modules/plattform';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { adminProcedure, protectedProcedure, router } from '../init.ts';
import { lesPostgresCause } from '../slett-postgres.ts';

type TenantTx = Parameters<Parameters<Database['transaction']>[0]>[0];

const felt = z.string().trim().max(200);

export type ForhandlerKort = {
  name: string;
  slug: string;
  orgnr: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  leftover: Record<string, unknown>;
};

export function somLeftover(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function tomtForhandlerKort(tenant: { name: string; slug: string }): ForhandlerKort {
  return {
    name: tenant.name,
    slug: tenant.slug,
    orgnr: '',
    address: '',
    postalCode: '',
    city: '',
    phone: '',
    email: '',
    website: '',
    leftover: {},
  };
}

export function erManglendeDealerProfil(error: unknown): boolean {
  const pg = lesPostgresCause(error);
  const topp = error instanceof Error ? error.message : '';
  const msg = `${pg.message ?? ''} ${topp}`;
  if (pg.code === '42P01' || pg.code === '42703') return true;
  if (pg.code === '42501' && /dealer_profiles/i.test(msg)) return true;
  return (
    /dealer_profiles/i.test(msg) &&
    /does not exist|undefined_(table|column)|permission denied/i.test(msg)
  );
}

function feltTekst(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

async function lesTenantNavn(tx: TenantTx, tenantId: string) {
  const [tenant] = await tx
    .select({
      name: schema.tenants.name,
      slug: schema.tenants.slug,
    })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId));
  if (!tenant) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Fant ikke forhandleren.' });
  }
  return tenant;
}

export async function lesForhandlerKort(tx: TenantTx, tenantId: string): Promise<ForhandlerKort> {
  const tenant = await lesTenantNavn(tx, tenantId);
  const [profil] = await tx
    .select({
      orgnr: schema.dealerProfiles.orgnr,
      address: schema.dealerProfiles.address,
      postalCode: schema.dealerProfiles.postalCode,
      city: schema.dealerProfiles.city,
      phone: schema.dealerProfiles.phone,
      email: schema.dealerProfiles.email,
      website: schema.dealerProfiles.website,
      leftover: schema.dealerProfiles.quickClient,
    })
    .from(schema.dealerProfiles)
    .where(eq(schema.dealerProfiles.tenantId, tenantId));
  return {
    name: tenant.name,
    slug: tenant.slug,
    orgnr: feltTekst(profil?.orgnr),
    address: feltTekst(profil?.address),
    postalCode: feltTekst(profil?.postalCode),
    city: feltTekst(profil?.city),
    phone: feltTekst(profil?.phone),
    email: feltTekst(profil?.email),
    website: feltTekst(profil?.website),
    leftover: somLeftover(profil?.leftover),
  };
}

/**
 * Ny transaksjon ved manglende tabell/kolonne — ikke catch inne i samme tx
 * (Postgres avbryter resten av transaksjonen etter 42P01).
 */
export async function hentForhandlerKort(
  kjor: (fn: (tx: TenantTx) => Promise<ForhandlerKort>) => Promise<ForhandlerKort>,
  tenantId: string,
): Promise<ForhandlerKort> {
  try {
    return await kjor((tx) => lesForhandlerKort(tx, tenantId));
  } catch (error) {
    if (!erManglendeDealerProfil(error)) throw error;
    const pg = lesPostgresCause(error);
    console.error('[forhandler.get] dealer_profiles utilgjengelig', {
      code: pg.code,
      message: pg.message,
    });
    return kjor(async (tx) => tomtForhandlerKort(await lesTenantNavn(tx, tenantId)));
  }
}

/**
 * Organisasjon › Forhandleren — butikken, ikke personen.
 * Skriving: dealer_admin (adminProcedure). Inspect leser via verksted.forhandleren.
 */
export const forhandlerRouter = router({
  get: adminProcedure.query(({ ctx }) =>
    hentForhandlerKort((fn) => withTenant(ctx.db, ctx.tenantId, fn), ctx.tenantId),
  ),

  /** Les-kort for alle innloggede på tenanten — Grainient-hjem. */
  kort: protectedProcedure.query(({ ctx }) =>
    hentForhandlerKort((fn) => withTenant(ctx.db, ctx.tenantId, fn), ctx.tenantId),
  ),

  update: adminProcedure
    .input(
      z.object({
        name: felt.min(1),
        orgnr: felt.max(32).optional(),
        address: felt.max(200).optional(),
        postalCode: felt.max(16).optional(),
        city: felt.max(80).optional(),
        phone: felt.max(40).optional(),
        email: felt.max(200).optional(),
        website: felt.max(200).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      withTenant(ctx.db, ctx.tenantId, async (tx) => {
        const [tenant] = await tx
          .select({
            slug: schema.tenants.slug,
            kind: schema.tenants.kind,
          })
          .from(schema.tenants)
          .where(eq(schema.tenants.id, ctx.tenantId));
        if (!tenant) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Fant ikke forhandleren.' });
        }
        if (erPlattformTenant(tenant)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Plattform-org kan ikke redigeres her.',
          });
        }

        const name = input.name.trim();
        await tx
          .update(schema.tenants)
          .set({ name, updatedAt: new Date() })
          .where(eq(schema.tenants.id, ctx.tenantId));
        await tx
          .update(schema.organization)
          .set({ name })
          .where(eq(schema.organization.id, ctx.tenantId));

        const now = new Date();
        const [eksisterende] = await tx
          .select({ leftover: schema.dealerProfiles.quickClient })
          .from(schema.dealerProfiles)
          .where(eq(schema.dealerProfiles.tenantId, ctx.tenantId));

        await tx
          .insert(schema.dealerProfiles)
          .values({
            tenantId: ctx.tenantId,
            orgnr: input.orgnr ?? '',
            address: input.address ?? '',
            postalCode: input.postalCode ?? '',
            city: input.city ?? '',
            phone: input.phone ?? '',
            email: input.email ?? '',
            website: input.website ?? '',
            quickClient: somLeftover(eksisterende?.leftover),
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: schema.dealerProfiles.tenantId,
            set: {
              orgnr: input.orgnr ?? '',
              address: input.address ?? '',
              postalCode: input.postalCode ?? '',
              city: input.city ?? '',
              phone: input.phone ?? '',
              email: input.email ?? '',
              website: input.website ?? '',
              updatedAt: now,
            },
          });

        return lesForhandlerKort(tx, ctx.tenantId);
      }),
    ),
});
