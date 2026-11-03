import { describe, expect, it } from 'vitest';
import { offentligTenantFraRad } from '../src/tenant-host/oppslag.ts';

describe('F18 / white label F2: offentlig tenant', () => {
  it('mapper offentlige felt og dropper alt uten slug/navn', () => {
    expect(offentligTenantFraRad(null)).toBeNull();
    expect(offentligTenantFraRad({ slug: 'bergen' })).toBeNull();
    expect(
      offentligTenantFraRad({
        slug: 'bergen',
        visningsnavn: 'Nordvik',
        logo_url: 'https://blob.example/logo.png',
        aksentfarge: '#141414',
        aksent_tekstfarge: '#ffffff',
        telefon: '555',
        epost: 'post@example.no',
        sted: 'Bergen',
        vis_levert_av: false,
      }),
    ).toEqual({
      slug: 'bergen',
      visningsnavn: 'Nordvik',
      logoUrl: 'https://blob.example/logo.png',
      aksentfarge: '#141414',
      aksentTekstfarge: '#ffffff',
      telefon: '555',
      epost: 'post@example.no',
      sted: 'Bergen',
      visLevertAv: false,
    });
  });

  it('har ikke tenant-id i returtypen', () => {
    const rad = offentligTenantFraRad({ slug: 'bergen', visningsnavn: 'Nordvik' });
    expect(rad).not.toBeNull();
    expect(JSON.stringify(rad)).not.toMatch(/tenant_id|tenantId/);
  });
});
