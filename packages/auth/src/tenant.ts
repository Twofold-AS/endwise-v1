import { randomUUID } from 'node:crypto';
import {
  and,
  type Database,
  eq,
  findMembership,
  schema,
  type TenantKind,
  withTenant,
} from '@endwise/db';
import type { Auth } from './auth.ts';
import type { Role } from './rbac.ts';

/**
 * F1-04 — Tenant-opprettelse og isolasjon.
 *
 * ADR-002: `organization.id` ER `tenant_id`. `tenants`-tabellen speiler
 * organisasjonen og eier de domene-nære feltene (config, entitlements henger på).
 * Én skriving, to tabeller — derfor transaksjon.
 */
export interface CreateTenantInput {
  name: string;
  slug: string;
  /** Brukeren som blir dealer_admin i den nye tenanten. */
  ownerUserId: string;
  /** Moduler tenanten starter med (entitlements, F0-04). */
  modules?: string[];
  plan?: string;
  /** F5-27: `demo` = dev-mode-tenant. Default `live` — fail-safe. */
  kind?: TenantKind;
  /**
   * Valgfrie tillegg eieren kan slå på i veiviseren. Skrives som
   * `source=optional`, `enabled=false`. Overlap med `modules` droppes.
   */
  optionalModules?: string[];
  /**
   * Seed og gamle kall: ferdig onboarding. Invite-only create sender `false`.
   */
  onboardingCompleted?: boolean;
}

/**
 * ⚠️ F5-26 — RLS-FELLA VED OPPRETTING, og hvorfor dette ser rart ut.
 *
 * `tenants` har policyen `id = current_setting('app.tenant_id')` — raden ER
 * tenanten. Insert av en NY tenant har derfor et kylling-og-egg-problem:
 * `withCheck` sammenligner mot en tenant-kontekst som ikke finnes ennå.
 *
 * Den late løsningen er å skrive som DB-eier og la RLS være usynlig. Etter at
 * `force row level security` kom på (F5-28 ③) er den løsningen død — og det er
 * bra, for den var alltid feil: den ville gjort tenant-oppretting til den ene
 * skrivestien i systemet uten isolasjon.
 *
 * Løsningen er i stedet å sette `app.tenant_id` til **den nye** id-en før
 * insert. Da passerer `withCheck` fordi raden faktisk hører til konteksten den
 * skrives i. RLS er fortsatt på, fortsatt håndhevet, og transaksjonen kan ikke
 * røre noen ANNEN tenants rader — `set_config(..., is_local => true)` gjelder
 * bare denne transaksjonen. Vi omgår ikke policyen; vi oppfyller den.
 *
 * Id-en kommer fra Better-Auth (`generateId: () => randomUUID()`), så
 * organisasjonen må opprettes først. ADR-002: `organization.id` ER `tenant_id`.
 */
export async function createTenant(
  auth: Auth,
  db: Database,
  input: CreateTenantInput,
): Promise<{ tenantId: string }> {
  const org = await auth.api.createOrganization({
    body: {
      name: input.name,
      slug: input.slug,
      userId: input.ownerUserId,
    },
  });

  if (!org) throw new Error('Kunne ikke opprette organisasjon');
  const tenantId = org.id;

  /**
   * ⚠️ **NORMALISER EIERENS ROLLE (09.08.2026). Dette var en ekte bug.**
   *
   * `auth.api.createOrganization` gir oppretteren Better-Auths egen
   * standardrolle **`owner`** — en verdi som ikke finnes i vår RBAC-modell
   * (`OrgRole` = customer | dealer_staff | dealer_admin | endwise_admin).
   * Doc-kommentaren på `ownerUserId` har hele tiden lovet «blir dealer_admin»;
   * koden leverte det ikke.
   *
   * Konsekvensen var ikke et hull, men noe nesten verre: en bruker som ble
   * stående med `owner` matchet INGEN rolleliste i navet. Da forsvant både
   * nav-radene og kontekstvelgeren, og brukeren var **låst inne i tenanten uten
   * en dør ut**. Det var nøyaktig symptomet i «Yamaha Bergen».
   *
   * Vi skriver derfor rollen om til `dealer_admin` med én gang. Ingen
   * rettighetsutvidelse — `dealer_admin` er det oppretteren var ment å få, og
   * det er en SVAKERE rolle enn Better-Auths `owner` ville vært om vi hadde
   * begynt å tolke den.
   */
  await db
    .update(schema.member)
    .set({ role: 'dealer_admin' })
    .where(
      and(eq(schema.member.organizationId, tenantId), eq(schema.member.userId, input.ownerUserId)),
    );

  await withTenant(db, tenantId, async (tx) => {
    await tx.insert(schema.tenants).values({
      id: tenantId,
      name: input.name,
      slug: input.slug,
      kind: input.kind ?? 'live',
      onboardingCompletedAt: input.onboardingCompleted === false ? null : new Date(),
    });

    const rader = pakkeRader(tenantId, input);
    if (rader.length) await tx.insert(schema.tenantModules).values(rader);
  });

  return { tenantId };
}

/**
 * F5-26 — Tenant UTEN eier-bruker. Brukes når e-posten ikke finnes ennå:
 * admin setter aldri passord, så vi kan ikke kalle `createOrganization`
 * med en userId. Organisasjon + tenants-rad + ev. tillegg skrives her;
 * eier-invitasjonen lager medlemskapet når invitee setter passordet.
 */
export async function createTenantShell(
  db: Database,
  input: Omit<CreateTenantInput, 'ownerUserId'>,
): Promise<{ tenantId: string }> {
  const tenantId = randomUUID();

  await db.insert(schema.organization).values({
    id: tenantId,
    name: input.name,
    slug: input.slug,
    createdAt: new Date(),
  });

  await withTenant(db, tenantId, async (tx) => {
    await tx.insert(schema.tenants).values({
      id: tenantId,
      name: input.name,
      slug: input.slug,
      kind: input.kind ?? 'live',
      onboardingCompletedAt: null,
    });

    const rader = pakkeRader(tenantId, input);
    if (rader.length) await tx.insert(schema.tenantModules).values(rader);
  });

  return { tenantId };
}

function pakkeRader(tenantId: string, input: Pick<CreateTenantInput, 'modules' | 'optionalModules' | 'plan'>) {
  const included = [...new Set(input.modules ?? [])];
  const optional = [...new Set(input.optionalModules ?? [])].filter((k) => !included.includes(k));
  const plan = input.plan ?? 'endwise';
  return [
    ...included.map((moduleKey) => ({
      tenantId,
      moduleKey,
      enabled: true,
      source: 'included' as const,
      plan,
    })),
    ...optional.map((moduleKey) => ({
      tenantId,
      moduleKey,
      enabled: false,
      source: 'optional' as const,
      plan,
    })),
  ];
}

export class TenantAccessError extends Error {
  readonly code = 'TENANT_FORBIDDEN';
  constructor(userId: string, tenantId: string) {
    super(`Bruker ${userId} er ikke medlem av tenant ${tenantId}`);
  }
}

/**
 * F1-04 — Den andre halvdelen av tenant-isolasjonen.
 *
 * RLS beskytter domenetabellene, men RLS kan ikke vite om brukeren HAR lov til
 * å be om denne tenanten — den stoler på `app.tenant_id`. Derfor: verifiser
 * medlemskap FØR `withTenant()` settes. Uten denne sjekken kan en innlogget
 * bruker be om en annen tenants ID og RLS vil lydig slippe det gjennom.
 */
export async function assertMember(db: Database, userId: string, tenantId: string): Promise<Role> {
  const membership = await findMembership(db, userId, tenantId);
  if (!membership) throw new TenantAccessError(userId, tenantId);
  return membership.role as Role;
}
