import { createDb } from '@endwise/db';
import { describe, expect, it } from 'vitest';
import { velgAktivOrganisasjon } from '../src/aktiv-org.ts';
import { createAuth } from '../src/auth.ts';
import { kanBrukePlattform } from '../src/plattform-passkey.ts';
import { PLATFORM_IDLE_TIMEOUT_SECONDS } from '../src/session-policy.ts';
import {
  cookiePrefixForSone,
  erEndwiseRolle,
  idleSekunderForSone,
  lesAuthSone,
  PLATFORM_COOKIE_PREFIX,
  rolleTillattISone,
} from '../src/sone.ts';

describe('F21 / white label F5: auth-sone', () => {
  it('platform har eget cookie-prefiks og kort idle', () => {
    expect(cookiePrefixForSone('platform')).toBe(PLATFORM_COOKIE_PREFIX);
    expect(cookiePrefixForSone('forhandler')).toBe('endwise');
    expect(idleSekunderForSone('platform')).toBe(PLATFORM_IDLE_TIMEOUT_SECONDS);
    expect(idleSekunderForSone('platform')).toBeLessThan(idleSekunderForSone('forhandler'));
  });

  it('rolle × sone: Endwise aldri på forhandler, dealer aldri på platform', () => {
    expect(rolleTillattISone('endwise_admin', 'platform')).toBe(true);
    expect(rolleTillattISone('endwise_support', 'platform')).toBe(true);
    expect(rolleTillattISone('dealer_admin', 'platform')).toBe(false);
    expect(rolleTillattISone('dealer_staff', 'platform')).toBe(false);
    expect(rolleTillattISone('customer', 'platform')).toBe(false);
    expect(rolleTillattISone('endwise_admin', 'forhandler')).toBe(false);
    expect(rolleTillattISone('endwise_support', 'forhandler')).toBe(false);
    expect(rolleTillattISone('dealer_admin', 'forhandler')).toBe(true);
    expect(rolleTillattISone('dealer_admin', 'app')).toBe(true);
    expect(rolleTillattISone('dealer_staff', 'app')).toBe(true);
    expect(rolleTillattISone('customer', 'app')).toBe(false);
    expect(rolleTillattISone('endwise_admin', 'app')).toBe(false);
    expect(rolleTillattISone(null, 'platform')).toBe(false);
    expect(erEndwiseRolle('dealer_admin')).toBe(false);
  });

  it('platform krever passkey i tillegg til rolle', () => {
    expect(kanBrukePlattform({ role: 'endwise_admin', harPasskey: true })).toBe(true);
    expect(kanBrukePlattform({ role: 'endwise_admin', harPasskey: false })).toBe(false);
    expect(kanBrukePlattform({ role: 'dealer_admin', harPasskey: true })).toBe(false);
  });

  it('lesAuthSone leser gyldig header uten flagg', () => {
    const h = new Headers({ 'x-endwise-sone': 'platform' });
    expect(lesAuthSone(h, {})).toBe('platform');
    expect(lesAuthSone(new Headers({ 'x-endwise-sone': 'forhandler' }), {})).toBe('forhandler');
    expect(lesAuthSone(new Headers({ 'x-endwise-sone': 'app' }), {})).toBe('app');
    expect(lesAuthSone(new Headers({ 'x-endwise-sone': 'marked' }), {})).toBeNull();
  });

  it('velgAktivOrganisasjon respekterer sone', () => {
    const mix = [
      { id: 'd1', slug: 'bergen', role: 'dealer_admin' },
      { id: 'e1', slug: 'endwise', role: 'endwise_admin' },
    ];
    expect(velgAktivOrganisasjon(mix, 'platform')).toBe('e1');
    expect(velgAktivOrganisasjon(mix, 'forhandler')).toBe('d1');
    expect(velgAktivOrganisasjon(mix, 'app')).toBe('d1');
    expect(velgAktivOrganisasjon(mix)).toBe('e1');
    expect(
      velgAktivOrganisasjon([{ id: 'd1', slug: 'bergen', role: 'dealer_admin' }], 'platform'),
    ).toBeNull();
  });

  it('createAuth platform bruker eget prefiks og 15 min idle', () => {
    process.env.BETTER_AUTH_URL = 'https://endwise.no';
    process.env.BETTER_AUTH_SECRET = 'x'.repeat(32);
    const auth = createAuth(createDb('postgres://ingen:ingen@127.0.0.1:1/ingen'), {
      sone: 'platform',
    });
    expect(auth.options.advanced?.cookiePrefix).toBe('endwise-pl');
    expect(auth.options.session?.expiresIn).toBe(PLATFORM_IDLE_TIMEOUT_SECONDS);
    expect(auth.options.baseURL).toBe('https://platform.endwise.no');
  });

  it('createAuth forhandler bruker <sub>.endwise.no som baseURL', () => {
    process.env.BETTER_AUTH_URL = 'https://endwise.no';
    process.env.BETTER_AUTH_SECRET = 'x'.repeat(32);
    const auth = createAuth(createDb('postgres://ingen:ingen@127.0.0.1:1/ingen'), {
      sone: 'forhandler',
      slug: 'bergen',
    });
    expect(auth.options.baseURL).toBe('https://bergen.endwise.no');
  });
});
