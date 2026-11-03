import { appDatabaseUrl, createDb, sql } from '@endwise/db';

/** Offentlige felt. Aldri tenant-id eller utkast — dette kan caches. */
export type OffentligTenant = {
  slug: string;
  visningsnavn: string;
  logoUrl: string | null;
  aksentfarge: string | null;
  aksentTekstfarge: string | null;
  telefon: string | null;
  epost: string | null;
  sted: string | null;
  visLevertAv: boolean;
  publisert: boolean;
};

type Rad = {
  slug?: string;
  visningsnavn?: string;
  logo_url?: string | null;
  aksentfarge?: string | null;
  aksent_tekstfarge?: string | null;
  telefon?: string | null;
  epost?: string | null;
  sted?: string | null;
  vis_levert_av?: boolean;
  publisert?: boolean;
};

export function offentligTenantFraRad(rad: Rad | undefined | null): OffentligTenant | null {
  if (!rad?.slug || !rad.visningsnavn) return null;
  return {
    slug: rad.slug,
    visningsnavn: rad.visningsnavn,
    logoUrl: rad.logo_url ?? null,
    aksentfarge: rad.aksentfarge ?? null,
    aksentTekstfarge: rad.aksent_tekstfarge ?? null,
    telefon: rad.telefon ?? null,
    epost: rad.epost ?? null,
    sted: rad.sted ?? null,
    visLevertAv: rad.vis_levert_av !== false,
    publisert: rad.publisert === true,
  };
}

let db: ReturnType<typeof createDb> | null = null;

function getDb(): ReturnType<typeof createDb> | null {
  const url = process.env.APP_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) return null;
  db ??= createDb(appDatabaseUrl());
  return db;
}

/**
 * Offentlig tenant fra Host (eller preview-slug). Feiler lukket: null.
 * Ingen tenant-id i retur.
 */
export async function slaaOppOffentligTenant(input: {
  host: string;
  slug?: string | null;
}): Promise<OffentligTenant | null> {
  try {
    const client = getDb();
    if (!client) return null;
    const host = input.host.trim().toLowerCase();
    const slug = input.slug?.trim().toLowerCase() ?? '';
    const res = await client.execute(
      sql`select slug, visningsnavn, logo_url, aksentfarge, aksent_tekstfarge,
                 telefon, epost, sted, vis_levert_av, publisert
            from lookup_tenant_by_host(${host}::text, ${slug || null}::text)`,
    );
    const rad = (res.rows ?? res)[0] as Rad | undefined;
    return offentligTenantFraRad(rad);
  } catch {
    return null;
  }
}
