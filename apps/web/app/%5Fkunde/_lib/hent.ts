import { slaaOppOffentligTenant } from '@endwise/modules/tenant-host/oppslag';
import { headers } from 'next/headers';
import { cache } from 'react';

export const hentOffentligKunde = cache(async (slug: string) => {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  return slaaOppOffentligTenant({ host, slug });
});
