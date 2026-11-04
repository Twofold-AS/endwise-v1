import { describe, expect, it } from 'vitest';
import {
  erReservertSlug,
  erWhiteLabelAktiv,
  normaliserVert,
  opplosTenantFraHost,
  RESERVERTE_SLUGS,
  slaaOppEgetDomene,
} from '../src/tenant-host/index.ts';

describe('F16 / white label F0: tenant-host', () => {
  it('white label er alltid på — flaggene er fjernet', () => {
    expect(erWhiteLabelAktiv()).toBe(true);
    expect(erWhiteLabelAktiv({})).toBe(true);
    expect(erWhiteLabelAktiv({ ENDWISE_WHITE_LABEL: '0' })).toBe(true);
  });

  it('normaliserer vert: små bokstaver, port og avsluttende punktum', () => {
    expect(normaliserVert('Bergen.Endwise.NO:443')).toBe('bergen.endwise.no');
    expect(normaliserVert('bergen.endwise.no.')).toBe('bergen.endwise.no');
    expect(normaliserVert('  WWW.ENDWISE.NO ')).toBe('www.endwise.no');
    expect(normaliserVert(null)).toBe('');
  });

  it('apex og www er marked', () => {
    expect(opplosTenantFraHost('endwise.no').sone).toBe('marked');
    expect(opplosTenantFraHost('www.endwise.no').sone).toBe('marked');
    expect(opplosTenantFraHost('localhost').sone).toBe('marked');
    expect(opplosTenantFraHost('127.0.0.1:3000').sone).toBe('marked');
  });

  it('platform.endwise.no er skjult admin-sone', () => {
    expect(opplosTenantFraHost('platform.endwise.no')).toEqual({
      sone: 'platform',
      slug: null,
      vert: 'platform.endwise.no',
    });
    expect(opplosTenantFraHost('platform.localhost:3000').sone).toBe('platform');
  });

  it('forhandler-slug fra subdomene', () => {
    expect(opplosTenantFraHost('bergen.endwise.no')).toEqual({
      sone: 'forhandler',
      slug: 'bergen',
      vert: 'bergen.endwise.no',
    });
    expect(opplosTenantFraHost('bergen-sentrum.endwise.no').slug).toBe('bergen-sentrum');
    expect(opplosTenantFraHost('nordvik.localhost').slug).toBe('nordvik');
  });

  it('reserverte ord blokkeres (ingen slug lekket)', () => {
    for (const slug of ['admin', 'api', 'login', 'logg-inn', 'support']) {
      expect(erReservertSlug(slug)).toBe(true);
      const r = opplosTenantFraHost(`${slug}.endwise.no`);
      expect(r.sone).toBe('reservert');
      expect(r.slug).toBeNull();
    }
    expect(erReservertSlug('app')).toBe(true);
    expect(opplosTenantFraHost('app.endwise.no')).toEqual({
      sone: 'app',
      slug: null,
      vert: 'app.endwise.no',
    });
    expect(opplosTenantFraHost('app.localhost:3000').sone).toBe('app');
    expect(erReservertSlug('www')).toBe(true);
    expect(opplosTenantFraHost('www.endwise.no').sone).toBe('marked');
    expect(RESERVERTE_SLUGS).toContain('platform');
    expect(RESERVERTE_SLUGS).toContain('app');
    expect(RESERVERTE_SLUGS).toContain('webmail');
  });

  it('endwise og endwise-* er reservert', () => {
    expect(erReservertSlug('endwise')).toBe(true);
    expect(erReservertSlug('endwise-admin')).toBe(true);
    expect(opplosTenantFraHost('endwise.endwise.no').sone).toBe('reservert');
    expect(opplosTenantFraHost('endwise-hjelp.endwise.no').sone).toBe('reservert');
  });

  it('ugyldig slug (kort, --, xn--) blir ikke forhandler', () => {
    expect(opplosTenantFraHost('ab.endwise.no').sone).toBe('ukjent');
    expect(opplosTenantFraHost('bergen--sentrum.endwise.no').sone).toBe('reservert');
    expect(opplosTenantFraHost('xn--bergen.endwise.no').sone).toBe('reservert');
    expect(opplosTenantFraHost('a.b.endwise.no').sone).toBe('ukjent');
  });

  it('ukjent vert uten eget-domene-treff røper ikke tenants', () => {
    expect(opplosTenantFraHost('verksted.no')).toEqual({
      sone: 'ukjent',
      slug: null,
      vert: 'verksted.no',
    });
    expect(slaaOppEgetDomene('verksted.no')).toBeNull();
  });

  it('eget-domene-stub kan injiseres (F3 fyller oppslaget)', () => {
    expect(
      opplosTenantFraHost('nordvik.no', { egetDomeneSlug: slaaOppEgetDomene('nordvik.no') }).sone,
    ).toBe('ukjent');
    expect(opplosTenantFraHost('nordvik.no', { egetDomeneSlug: 'nordvik' })).toEqual({
      sone: 'forhandler',
      slug: 'nordvik',
      vert: 'nordvik.no',
    });
  });

  it('preview-overstyring virker bare utenfor production', () => {
    expect(
      opplosTenantFraHost('endwise-v1-web.vercel.app', {
        vercelEnv: 'preview',
        previewSlug: 'bergen',
      }).slug,
    ).toBe('bergen');
    expect(
      opplosTenantFraHost('endwise-v1-web.vercel.app', {
        vercelEnv: 'production',
        previewSlug: 'bergen',
      }).sone,
    ).toBe('ukjent');
  });

  it('tom host er ukjent', () => {
    expect(opplosTenantFraHost('').sone).toBe('ukjent');
    expect(opplosTenantFraHost(undefined).sone).toBe('ukjent');
  });

  it('rotDomene tåler punktum rundt uten regex', () => {
    expect(opplosTenantFraHost('bergen.endwise.no', { rotDomene: '..endwise.no.' }).slug).toBe(
      'bergen',
    );
  });
});
