import { describe, expect, it } from 'vitest';
import {
  erWhiteLabelAktiv,
  lesKontekst,
  ruteFraSone,
  UKJENT_KUNDE_STI,
} from '../src/tenant-host/index.ts';

describe('F18 / white label F2: ruteFraSone', () => {
  it('flagget er på med ENDWISE_WHITE_LABEL eller SPIKE', () => {
    expect(erWhiteLabelAktiv({})).toBe(false);
    expect(erWhiteLabelAktiv({ ENDWISE_WHITE_LABEL: '1' })).toBe(true);
    expect(erWhiteLabelAktiv({ ENDWISE_WHITE_LABEL_SPIKE: '1' })).toBe(true);
  });

  it('marked går videre uten rewrite', () => {
    expect(ruteFraSone({ sone: 'marked', slug: null, path: '/', kontekst: null })).toEqual({
      type: 'next',
    });
    expect(ruteFraSone({ sone: 'marked', slug: null, path: '/home', kontekst: null })).toEqual({
      type: 'next',
    });
  });

  it('forhandler kunde-stier rewrite til /_kunde/<slug>', () => {
    expect(ruteFraSone({ sone: 'forhandler', slug: 'bergen', path: '/', kontekst: null })).toEqual({
      type: 'rewrite',
      dest: '/_kunde/bergen',
    });
    expect(
      ruteFraSone({
        sone: 'forhandler',
        slug: 'bergen',
        path: '/bestill',
        kontekst: null,
      }),
    ).toEqual({ type: 'rewrite', dest: '/_kunde/bergen/bestill' });
    expect(
      ruteFraSone({
        sone: 'forhandler',
        slug: 'bergen',
        path: '/bookinger',
        kontekst: null,
      }),
    ).toEqual({ type: 'rewrite', dest: '/_kunde/bergen/bookinger' });
    expect(
      ruteFraSone({
        sone: 'forhandler',
        slug: 'bergen',
        path: '/meldinger',
        kontekst: null,
      }),
    ).toEqual({ type: 'rewrite', dest: '/_kunde/bergen/meldinger' });
    expect(
      ruteFraSone({
        sone: 'forhandler',
        slug: 'bergen',
        path: '/deler',
        kontekst: null,
      }),
    ).toEqual({ type: 'rewrite', dest: '/_kunde/bergen/deler' });
    expect(
      ruteFraSone({
        sone: 'forhandler',
        slug: 'bergen',
        path: '/signin',
        kontekst: null,
      }),
    ).toEqual({ type: 'rewrite', dest: '/_kunde/bergen/logg-inn' });
  });

  it('(app)-sti uten Bedrift går til logg-inn', () => {
    expect(
      ruteFraSone({ sone: 'forhandler', slug: 'bergen', path: '/home', kontekst: null }),
    ).toEqual({ type: 'rewrite', dest: '/_kunde/bergen/logg-inn' });
    expect(
      ruteFraSone({
        sone: 'forhandler',
        slug: 'bergen',
        path: '/home',
        kontekst: 'privat',
      }),
    ).toEqual({ type: 'rewrite', dest: '/_kunde/bergen/logg-inn' });
  });

  it('(app)-sti med Bedrift går videre', () => {
    expect(
      ruteFraSone({
        sone: 'forhandler',
        slug: 'bergen',
        path: '/home',
        kontekst: 'bedrift',
      }),
    ).toEqual({ type: 'next' });
  });

  it('ukjent og reservert er nøytral 404', () => {
    expect(ruteFraSone({ sone: 'ukjent', slug: null, path: '/', kontekst: null })).toEqual({
      type: 'not-found',
    });
    expect(ruteFraSone({ sone: 'reservert', slug: null, path: '/', kontekst: null })).toEqual({
      type: 'not-found',
    });
    expect(UKJENT_KUNDE_STI).toBe('/_kunde/_ukjent');
  });

  it('platform rewriter rot og innlogging, admin-stier går videre', () => {
    expect(ruteFraSone({ sone: 'platform', slug: null, path: '/', kontekst: null })).toEqual({
      type: 'rewrite',
      dest: '/_plattform',
    });
    expect(
      ruteFraSone({ sone: 'platform', slug: null, path: '/logg-inn', kontekst: null }),
    ).toEqual({
      type: 'rewrite',
      dest: '/_plattform/logg-inn',
    });
    expect(ruteFraSone({ sone: 'platform', slug: null, path: '/signin', kontekst: null })).toEqual({
      type: 'rewrite',
      dest: '/_plattform/logg-inn',
    });
    expect(ruteFraSone({ sone: 'platform', slug: null, path: '/endwise', kontekst: null })).toEqual(
      {
        type: 'next',
      },
    );
    expect(ruteFraSone({ sone: 'platform', slug: null, path: '/admin', kontekst: null })).toEqual({
      type: 'next',
    });
    expect(
      ruteFraSone({
        sone: 'platform',
        slug: null,
        path: '/_plattform',
        kontekst: null,
      }),
    ).toEqual({ type: 'next' });
  });

  it('marked og forhandler skjuler /endwise og /admin', () => {
    expect(ruteFraSone({ sone: 'marked', slug: null, path: '/endwise', kontekst: null })).toEqual({
      type: 'not-found',
    });
    expect(
      ruteFraSone({
        sone: 'forhandler',
        slug: 'bergen',
        path: '/endwise',
        kontekst: 'bedrift',
      }),
    ).toEqual({ type: 'not-found' });
  });

  it('API og statisk går videre', () => {
    expect(
      ruteFraSone({
        sone: 'forhandler',
        slug: 'bergen',
        path: '/api/auth/ok',
        kontekst: null,
      }),
    ).toEqual({ type: 'next' });
    expect(
      ruteFraSone({
        sone: 'ukjent',
        slug: null,
        path: '/_next/static/x.js',
        kontekst: null,
      }),
    ).toEqual({ type: 'next' });
  });

  it('lesKontekst virker bare utenfor production', () => {
    expect(lesKontekst('bedrift', 'preview')).toBe('bedrift');
    expect(lesKontekst('privat', 'development')).toBe('privat');
    expect(lesKontekst('bedrift', 'production')).toBeNull();
    expect(lesKontekst('nei', 'preview')).toBeNull();
  });
});
