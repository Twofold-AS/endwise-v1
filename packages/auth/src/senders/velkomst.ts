import { and, type Database, eq, schema, withTenant } from '@endwise/db';
import { byggEpostHtml, esc } from './epost-mal.ts';
import type { EpostMerke } from './merke.ts';
import { sendEmail } from './resend.ts';

/** Aldri ved Quick-import. */
export function skalSendeVelkomst(source: string | null | undefined): boolean {
  return (source ?? '').trim().toLowerCase() !== 'quick';
}

/**
 * Velkomst uten personopplysninger i teksten (art. 13-lenke, avmelding).
 * Ingen kundenavn, e-post, telefon eller adresse.
 */
export function byggVelkomstEpost(input: {
  merke: EpostMerke;
  personvernUrl: string;
  avmeldUrl: string;
}): { subject: string; text: string; html: string } {
  const subject = 'Velkommen';
  const text = [
    'Du er registrert hos verkstedet.',
    `Personvernerklæring: ${input.personvernUrl}`,
    `Avmelding: ${input.avmeldUrl}`,
    input.merke.levertAv ? 'Levert av Endwise' : '',
  ]
    .filter(Boolean)
    .join('\n');
  const html = byggEpostHtml({
    tittel: 'Velkommen',
    ingress: 'Du er registrert hos verkstedet.',
    innhold: `<p style="margin:0 0 12px 0;font-size:17px;line-height:1.47;">Les personvernerklæringen:</p>
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
): Promise<{ sendt: boolean; grunn?: string }> {
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
      .limit(1);
    return { kunde, tenant, branding, sendt: Boolean(sendt) };
  });

  if (!rad.kunde) return { sendt: false, grunn: 'ukjent' };
  if (!skalSendeVelkomst(rad.kunde.source)) return { sendt: false, grunn: 'quick' };
  if (!rad.kunde.email) return { sendt: false, grunn: 'ingen_epost' };
  if (rad.sendt) return { sendt: false, grunn: 'allerede' };

  const rot = process.env.TENANT_ROOT_DOMAIN ?? 'endwise.no';
  const slug = rad.tenant?.slug ?? '';
  const base = slug ? `https://${slug}.${rot}` : `https://${rot}`;
  const merkenavn = rad.branding?.visningsnavn || rad.tenant?.name || 'Verkstedet';
  const epost = byggVelkomstEpost({
    merke: {
      navn: merkenavn,
      levertAv: true,
      logoUrl: rad.branding?.logoUrl ?? null,
    },
    personvernUrl: `${base}/personvern`,
    avmeldUrl: `${base}/personvern`,
  });
  await sendEmail({
    to: rad.kunde.email,
    subject: epost.subject,
    text: epost.text,
    html: epost.html,
    avsender: { visningsnavn: merkenavn },
    idempotencyKey: `velkomst:${tenantId}:${customerId}`,
  });
  await withTenant(db, tenantId, (tx) =>
    tx.insert(schema.auditLog).values({
      tenantId,
      actor: 'system:velkomst',
      action: 'kunde.velkomst',
      subjectType: 'customer',
      subjectId: customerId,
      metadata: { kilde: rad.kunde?.source ?? 'endwise' },
    }),
  );
  return { sendt: true };
}
