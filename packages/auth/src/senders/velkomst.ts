import { and, type Database, desc, eq, schema, withTenant } from '@endwise/db';
import { forhandlerOffentligUrl } from '../sone.ts';
import { byggEpostHtml, esc, knapp } from './epost-mal.ts';
import type { EpostMerke } from './merke.ts';
import { sendEmail } from './resend.ts';

/** Aldri ved Quick-import. */
export function skalSendeVelkomst(source: string | null | undefined): boolean {
  return (source ?? '').trim().toLowerCase() !== 'quick';
}

function loggVelkomst(input: {
  tenantId: string;
  customerId: string;
  sendt: boolean;
  grunn?: string;
}): void {
  console.info('[kunde.velkomst]', {
    tenantId: input.tenantId,
    customerId: input.customerId,
    sendt: input.sendt,
    grunn: input.grunn ?? (input.sendt ? 'ok' : 'ukjent'),
  });
}

/**
 * Velkomst uten personopplysninger i teksten (art. 13-lenke, avmelding).
 * Ingen kundenavn, e-post, telefon eller adresse.
 */
export function byggVelkomstEpost(input: {
  merke: EpostMerke;
  personvernUrl: string;
  avmeldUrl: string;
  loggInnUrl: string;
}): { subject: string; text: string; html: string } {
  const subject = 'Velkommen';
  const text = [
    'Du er registrert hos verkstedet.',
    `Logg inn: ${input.loggInnUrl}`,
    `Personvernerklæring: ${input.personvernUrl}`,
    `Avmelding: ${input.avmeldUrl}`,
    input.merke.levertAv ? 'Levert av Endwise' : '',
  ]
    .filter(Boolean)
    .join('\n');
  const html = byggEpostHtml({
    tittel: 'Velkommen',
    ingress: 'Du er registrert hos verkstedet.',
    innhold: `${knapp(input.loggInnUrl, 'Logg inn')}
<p style="margin:0 0 12px 0;font-size:17px;line-height:1.47;">Les personvernerklæringen:</p>
<p style="margin:0 0 16px 0;font-size:15px;word-break:break-all;"><a href="${esc(input.personvernUrl)}" style="color:#141414;text-decoration:underline;">${esc(input.personvernUrl)}</a></p>
<p style="margin:0;font-size:13px;">Vil du ikke ha slike e-poster? <a href="${esc(input.avmeldUrl)}" style="color:#141414;text-decoration:underline;">Meld deg av</a>.</p>`,
    fotnote: 'Ingen personopplysninger i denne e-posten. Rettslig grunnlag: avtale.',
    merke: input.merke,
  });
  return { subject, text, html };
}

export async function sendVelkomstEtterKnytning(
  db: Database,
  tenantId: string,
  customerId: string,
  opts?: { tving?: boolean },
): Promise<{ sendt: boolean; grunn?: string }> {
  const ferdig = (sendt: boolean, grunn?: string) => {
    loggVelkomst({ tenantId, customerId, sendt, grunn });
    return { sendt, grunn };
  };

  const rad = await withTenant(db, tenantId, async (tx) => {
    const [kunde] = await tx
      .select({
        id: schema.customers.id,
        email: schema.customers.email,
        source: schema.customers.source,
      })
      .from(schema.customers)
      .where(and(eq(schema.customers.id, customerId), eq(schema.customers.tenantId, tenantId)))
      .limit(1);
    const [tenant] = await tx
      .select({ name: schema.tenants.name, slug: schema.tenants.slug })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId))
      .limit(1);
    const [branding] = await tx
      .select({
        visningsnavn: schema.tenantBranding.visningsnavn,
        logoUrl: schema.tenantBranding.logoUrl,
      })
      .from(schema.tenantBranding)
      .where(eq(schema.tenantBranding.tenantId, tenantId))
      .limit(1);
    const [sendt] = await tx
      .select({ id: schema.auditLog.id })
      .from(schema.auditLog)
      .where(
        and(
          eq(schema.auditLog.tenantId, tenantId),
          eq(schema.auditLog.action, 'kunde.velkomst'),
          eq(schema.auditLog.subjectId, customerId),
        ),
      )
      .orderBy(desc(schema.auditLog.occurredAt))
      .limit(1);
    return { kunde, tenant, branding, sendt: Boolean(sendt) };
  });

  if (!rad.kunde) return ferdig(false, 'ukjent');
  if (!skalSendeVelkomst(rad.kunde.source)) return ferdig(false, 'quick');
  if (!rad.kunde.email) return ferdig(false, 'ingen_epost');
  if (rad.sendt && !opts?.tving) return ferdig(false, 'allerede');

  const slug = rad.tenant?.slug ?? '';
  const base = slug ? forhandlerOffentligUrl(slug) : null;
  if (!base) return ferdig(false, 'ingen_slug');
  const merkenavn = rad.branding?.visningsnavn || rad.tenant?.name || 'Verkstedet';
  const epost = byggVelkomstEpost({
    merke: {
      navn: merkenavn,
      levertAv: true,
      logoUrl: rad.branding?.logoUrl ?? null,
    },
    personvernUrl: `${base}/personvern`,
    avmeldUrl: `${base}/personvern`,
    loggInnUrl: `${base}/logg-inn`,
  });
  try {
    await sendEmail({
      to: rad.kunde.email,
      subject: epost.subject,
      text: epost.text,
      html: epost.html,
      avsender: { visningsnavn: merkenavn },
      idempotencyKey: opts?.tving
        ? `velkomst:${tenantId}:${customerId}:${Date.now()}`
        : `velkomst:${tenantId}:${customerId}`,
    });
  } catch {
    return ferdig(false, 'feil');
  }
  await withTenant(db, tenantId, (tx) =>
    tx.insert(schema.auditLog).values({
      tenantId,
      actor: 'system:velkomst',
      action: 'kunde.velkomst',
      subjectType: 'customer',
      subjectId: customerId,
      metadata: { kilde: rad.kunde?.source ?? 'endwise', tving: Boolean(opts?.tving) },
    }),
  );
  return ferdig(true);
}
