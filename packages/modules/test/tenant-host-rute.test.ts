import { describe, expect, it } from 'vitest';
import {
  erWhiteLabelAktiv,
  lesKontekst,
  ruteFraSone,
  UKJENT_KUNDE_STI,
} from '../src/tenant-host/index.ts';

describe('F18 / white label F2: ruteFraSone', () => {
  it('white label er alltid på', () => {
    expect(erWhiteLabelAktiv({})).toBe(true);
    expect(erWhiteLabelAktiv({ ENDWISE_WHITE_LABEL: '0' })).toBe(true);
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
        path: '/mine-data',
        kontekst: null,
      }),
    ).toEqual({ type: 'rewrite', dest: '/_kunde/bergen/mine-data' });
    expect(
      ruteFraSone({
        sone: 'forhandler',
        slug: 'bergen',
        path: '/signin',
        kontekst: null,
      }),
    ).toEqual({ type: 'rewrite', dest: '/_kunde/bergen/logg-inn' });
  });

  it('(app)-sti på kundevert er nøytral 404 — bedrift bor på app.endwise.no', () => {
    expect(
      ruteFraSone({ sone: 'forhandler', slug: 'bergen', path: '/home', kontekst: null }),
    ).toEqual({ type: 'not-found' });
    expect(
      ruteFraSone({
        sone: 'forhandler',
        slug: 'bergen',
        path: '/home',
        kontekst: 'bedrift',
      }),
    ).toEqual({ type: 'not-found' });
  });

  it('app-sone rewriter innlogging og slipper (app) videre', () => {
    expect(ruteFraSone({ sone: 'app', slug: null, path: '/', kontekst: null })).toEqual({
      type: 'rewrite',
      dest: '/_bedrift/logg-inn',
    });
    expect(ruteFraSone({ sone: 'app', slug: null, path: '/logg-inn', kontekst: null })).toEqual({
      type: 'rewrite',
      dest: '/_bedrift/logg-inn',
    });
    expect(ruteFraSone({ sone: 'app', slug: null, path: '/home', kontekst: null })).toEqual({
      type: 'next',
    });
    expect(ruteFraSone({ sone: 'app', slug: null, path: '/bestill', kontekst: null })).toEqual({
      type: 'not-found',
    });
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
