import { afterEach, describe, expect, it } from 'vitest';
import {
  byggSlugSvar,
  erManuellSlug,
  foreslaSlug,
  forslagVedKollisjon,
  nullstillSlugSjekkTeller,
  slugSchema,
  slugSjekkTillatt,
  vurderSlugFormat,
} from '../src/slug/index.ts';
import { erWhiteLabelAktiv } from '../src/tenant-host/flagg.ts';
import { erReservertSlug } from '../src/tenant-host/reserverte-slugs.ts';

describe('F17 / white label F1: slug', () => {
  afterEach(() => nullstillSlugSjekkTeller());

  it('3–32 tegn, små bokstaver, tall og bindestrek', () => {
    expect(slugSchema.safeParse('bergen').success).toBe(true);
    expect(slugSchema.safeParse('ab').success).toBe(false);
    expect(slugSchema.safeParse('a'.repeat(33)).success).toBe(false);
    expect(slugSchema.safeParse('Bergen').success).toBe(true);
    expect(slugSchema.safeParse('bergen').data).toBe('bergen');
    expect(slugSchema.safeParse('-bergen').success).toBe(false);
    expect(slugSchema.safeParse('bergen-').success).toBe(false);
    expect(slugSchema.safeParse('bergen--sentrum').success).toBe(false);
    expect(slugSchema.safeParse('xn--bergen').success).toBe(false);
  });

  it('store/små bokstaver er samme slug', () => {
    expect(vurderSlugFormat('Bergen').ok && vurderSlugFormat('Bergen').slug).toBe('bergen');
    expect(vurderSlugFormat('BERGEN')).toEqual({ ok: true, slug: 'bergen' });
  });

  it('reserverte ord avvises', () => {
    expect(erReservertSlug('platform')).toBe(true);
    expect(erReservertSlug('app')).toBe(true);
    expect(slugSchema.safeParse('app').success).toBe(false);
    expect(erReservertSlug('endwise')).toBe(true);
    expect(erReservertSlug('endwise-hjelp')).toBe(true);
    expect(slugSchema.safeParse('platform').success).toBe(false);
    expect(byggSlugSvar('admin', { opptatt: false }).grunn).toBe('reservert');
    expect(byggSlugSvar('admin', { opptatt: false }).ledig).toBe(false);
  });

  it('forslag fra firmanavn/sted med æøå', () => {
    expect(foreslaSlug('Nordvik MC')).toBe('nordvik-mc');
    expect(foreslaSlug('Ålesund')).toBe('aalesund');
    expect(foreslaSlug('Tromsø')).toBe('tromso');
    expect(foreslaSlug('Blæst')).toBe('blaest');
  });

  it('forslag ved kollisjon uten å røpe eier', () => {
    const forslag = forslagVedKollisjon({
      slug: 'bergen',
      sted: 'sentrum',
      firmanavn: 'Nordvik',
    });
    expect(forslag).toContain('bergen-sentrum');
    expect(forslag).toContain('bergen-nordvik');
    expect(forslag).toContain('bergen-2');
    expect(forslag.join(' ')).not.toMatch(/eier|forhandler|as/i);
  });

  it('merkenavn krever manuell godkjenning', () => {
    expect(erManuellSlug('vipps')).toBe(true);
    expect(byggSlugSvar('vipps', { opptatt: false }).grunn).toBe('manuell');
    expect(byggSlugSvar('vipps', { opptatt: false }).ledig).toBe(false);
  });

  it('ledig når format ok og ikke opptatt', () => {
    expect(byggSlugSvar('bergen', { opptatt: false })).toMatchObject({
      ledig: true,
      grunn: 'ledig',
      slug: 'bergen',
    });
    expect(byggSlugSvar('bergen', { opptatt: true }).grunn).toBe('opptatt');
    expect(byggSlugSvar('bergen', { opptatt: true }).forslag.length).toBeGreaterThan(0);
  });

  it('rate-limit: 20 sjekker per nøkkel per minutt', () => {
    for (let i = 0; i < 20; i++) {
      expect(slugSjekkTillatt('inv-1')).toBe(true);
    }
    expect(slugSjekkTillatt('inv-1')).toBe(false);
    expect(slugSjekkTillatt('inv-2')).toBe(true);
  });

  it('white label er alltid på', () => {
    expect(erWhiteLabelAktiv({})).toBe(true);
    expect(erWhiteLabelAktiv({ ENDWISE_WHITE_LABEL: '0' })).toBe(true);
  });
});
