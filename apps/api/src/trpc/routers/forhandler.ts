import { type Database, eq, schema, withTenant } from '@endwise/db';
import { erPlattformTenant } from '@endwise/modules/plattform';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { adminProcedure, router } from '../init.ts';

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

export async function lesForhandlerKort(tx: TenantTx, tenantId: string): Promise<ForhandlerKort> {
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
    orgnr: profil?.orgnr ?? '',
    address: profil?.address ?? '',
    postalCode: profil?.postalCode ?? '',
    city: profil?.city ?? '',
    phone: profil?.phone ?? '',
    email: profil?.email ?? '',
    website: profil?.website ?? '',
    leftover: profil?.leftover ?? {},
  };
}

/**
 * Organisasjon › Forhandleren — butikken, ikke personen.
 * Skriving: dealer_admin (adminProcedure). Inspect leser via verksted.forhandleren.
 */
export const forhandlerRouter = router({
  get: adminProcedure.query(({ ctx }) =>
    withTenant(ctx.db, ctx.tenantId, (tx) => lesForhandlerKort(tx, ctx.tenantId)),
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
            quickClient: eksisterende?.leftover ?? {},
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
