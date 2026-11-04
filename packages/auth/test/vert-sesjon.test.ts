import { describe, expect, it } from 'vitest';
import { kundeTenantFraHost, vertSesjonTillatt } from '../src/vert-sesjon.ts';

const moss = '11111111-1111-1111-1111-111111111111';
const bergen = '22222222-2222-2222-2222-222222222222';

describe('F40 — vertSesjonTillatt', () => {
  it('platform og app er ikke bundet til host-forhandler', () => {
    expect(vertSesjonTillatt({ authSone: 'platform', hostTenantId: null, sesjonOrg: moss })).toBe(
      true,
    );
    expect(vertSesjonTillatt({ authSone: 'app', hostTenantId: null, sesjonOrg: moss })).toBe(true);
    expect(vertSesjonTillatt({ authSone: null, hostTenantId: null, sesjonOrg: moss })).toBe(true);
  });

  it('forhandler uten kjent host-tenant avvises', () => {
    expect(vertSesjonTillatt({ authSone: 'forhandler', hostTenantId: null, sesjonOrg: moss })).toBe(
      false,
    );
  });

  it('sesjon fra Moss på Bergen-vert avvises', () => {
    expect(
      vertSesjonTillatt({ authSone: 'forhandler', hostTenantId: bergen, sesjonOrg: moss }),
    ).toBe(false);
  });

  it('samme forhandler, eller kunde uten activeOrganizationId, slipper gjennom', () => {
    expect(vertSesjonTillatt({ authSone: 'forhandler', hostTenantId: moss, sesjonOrg: moss })).toBe(
      true,
    );
    expect(vertSesjonTillatt({ authSone: 'forhandler', hostTenantId: moss, sesjonOrg: null })).toBe(
      true,
    );
  });
});

describe('F40 — kundeTenantFraHost', () => {
  it('krever samme tenant på host og i sesjon', () => {
    expect(kundeTenantFraHost({ hostTenantId: moss, tenantId: moss })).toBe(true);
    expect(kundeTenantFraHost({ hostTenantId: bergen, tenantId: moss })).toBe(false);
    expect(kundeTenantFraHost({ hostTenantId: null, tenantId: moss })).toBe(false);
    expect(kundeTenantFraHost({ hostTenantId: moss, tenantId: null })).toBe(false);
  });
});
