import { and, asc, createDb, eq, schema } from '@endwise/db';
import { APIError } from 'better-auth/api';
import { authEnv } from './env.ts';

/**
 * CWE-284 — plattform-eier (første endwise_admin på org slug=endwise)
 * kan ikke degraderes eller fjernes via Better-Auth organization-API.
 * UI sperrer allerede; denne hooken + DB-triggeren er sperren mot direkte kall.
 */

const EIER_STIER = ['/organization/update-member-role', '/organization/remove-member'] as const;

let hookDb: ReturnType<typeof createDb> | undefined;

function dbForHook() {
  hookDb ??= createDb(authEnv.databaseUrl);
  return hookDb;
}

function tekst(verdi: unknown): string | undefined {
  return typeof verdi === 'string' && verdi.length > 0 ? verdi : undefined;
}

function malFraBody(body: unknown): {
  memberId?: string;
  userId?: string;
  email?: string;
  organizationId?: string;
} {
  if (typeof body !== 'object' || body === null) return {};
  const b = body as Record<string, unknown>;
  return {
    memberId: tekst(b.memberId) ?? tekst(b.memberIdOrEmail),
    userId: tekst(b.userId),
    email: tekst(b.email),
    organizationId: tekst(b.organizationId),
  };
}

async function finnPlattformEierId(
  db: ReturnType<typeof createDb>,
  organizationId: string,
): Promise<string | null> {
  const [org] = await db
    .select({ id: schema.organization.id, slug: schema.organization.slug })
    .from(schema.organization)
    .where(eq(schema.organization.id, organizationId))
    .limit(1);
  if (org?.slug !== 'endwise') return null;

  const [eier] = await db
    .select({ id: schema.member.id, userId: schema.member.userId })
    .from(schema.member)
    .where(
      and(
        eq(schema.member.organizationId, organizationId),
        eq(schema.member.role, 'endwise_admin'),
      ),
    )
    .orderBy(asc(schema.member.createdAt))
    .limit(1);
  return eier?.id ?? null;
}

export async function eierLasForHook(ctx: {
  path: string;
  body?: unknown;
  context: { session?: { session?: { activeOrganizationId?: unknown } } };
}): Promise<void> {
  if (!EIER_STIER.some((sti) => ctx.path === sti || ctx.path.endsWith(sti))) return;

  const mal = malFraBody(ctx.body);
  const orgId = mal.organizationId ?? tekst(ctx.context.session?.session?.activeOrganizationId);
  if (!orgId) return;

  const db = dbForHook();
  const eierMemberId = await finnPlattformEierId(db, orgId);
  if (!eierMemberId) return;

  const [eier] = await db
    .select({
      id: schema.member.id,
      userId: schema.member.userId,
    })
    .from(schema.member)
    .where(eq(schema.member.id, eierMemberId))
    .limit(1);

  const treffer =
    (mal.memberId && (mal.memberId === eier?.id || mal.memberId === eier?.userId)) ||
    (mal.userId && mal.userId === eier?.userId);

  if (mal.email && !treffer) {
    const [bruker] = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, mal.email))
      .limit(1);
    if (bruker && bruker.id === eier?.userId) {
      throw new APIError('FORBIDDEN', {
        message: 'Kan ikke fjerne eller endre plattform-eieren.',
      });
    }
    return;
  }

  if (treffer) {
    throw new APIError('FORBIDDEN', {
      message: 'Kan ikke fjerne eller endre plattform-eieren.',
    });
  }
}
