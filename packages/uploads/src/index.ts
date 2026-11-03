import { sjekkLogoBytes } from '@endwise/modules/branding';

export { sjekkLogoBytes } from '@endwise/modules/branding';

export type LogoOpplasting = {
  url: string;
  mime: 'image/png' | 'image/webp';
};

/**
 * F19 / white label F3 — logo til Vercel Blob.
 * Validerer MIME (ingen SVG), stripper PNG-metadata, laster opp.
 */
export async function lastOppLogo(input: {
  tenantId: string;
  bytes: Uint8Array;
  token?: string;
}): Promise<LogoOpplasting> {
  const sjekk = sjekkLogoBytes(input.bytes);
  if (!sjekk.ok) throw new Error(sjekk.grunn);

  const token = input.token ?? process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('Opplasting er ikke satt opp.');

  const { put } = await import('@vercel/blob');
  const sti = `branding/${input.tenantId}/logo-${Date.now()}.${sjekk.mime === 'image/png' ? 'png' : 'webp'}`;
  const res = await put(sti, Buffer.from(sjekk.bytes), {
    access: 'public',
    token,
    contentType: sjekk.mime,
    addRandomSuffix: true,
  });
  return { url: res.url, mime: sjekk.mime };
}
