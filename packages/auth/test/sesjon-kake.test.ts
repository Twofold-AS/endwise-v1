import { describe, expect, it } from 'vitest';
import { harSesjonsCookie } from '../src/session.ts';

/**
 * F13-01 — uautentisert tRPC skal ikke åpne Better-Auth-sesjonsoppslag
 * mot Postgres. Porten er kaken (`endwise.session_token` / `__Secure-`).
 * Produktreglene (idle, absolut, 2FA) er uendret når kaken finnes.
 */
describe('harSesjonsCookie', () => {
  it('false uten cookie-header og uten session_token', () => {
    expect(harSesjonsCookie(new Headers())).toBe(false);
    expect(harSesjonsCookie(new Headers({ cookie: '' }))).toBe(false);
    expect(harSesjonsCookie(new Headers({ cookie: 'endwise.two_factor=abc; Path=/' }))).toBe(false);
  });

  it('true for endwise.session_token og __Secure-endwise.session_token', () => {
    expect(harSesjonsCookie(new Headers({ cookie: 'endwise.session_token=abc' }))).toBe(true);
    expect(
      harSesjonsCookie(new Headers({ cookie: '__Secure-endwise.session_token=xyz; Path=/' })),
    ).toBe(true);
    expect(
      harSesjonsCookie(
        new Headers({
          cookie: 'other=1; endwise.session_token=abc; theme=dark',
        }),
      ),
    ).toBe(true);
  });

  it('matcher ikke substring i andre kaker', () => {
    expect(harSesjonsCookie(new Headers({ cookie: 'not_endwise.session_token=abc' }))).toBe(false);
    expect(harSesjonsCookie(new Headers({ cookie: 'endwise.session_data=abc' }))).toBe(false);
  });
});
