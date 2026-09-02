import { createDb } from '@endwise/db';
import { afterEach, describe, expect, it } from 'vitest';
import { createAuth } from '../src/auth.ts';
import { authPublicUrl, authTrustedOrigins } from '../src/auth-origins.ts';

/**
 * F1-01 / F13 — **betrodde origins, låst.**
 * Preview og produksjonsalias på Vercel kjører `NODE_ENV=production`, så den
 * gamle «kun i dev»-lista slapp aldri inn `VERCEL_URL`. Da ble
 * `https://endwise-v1-web.vercel.app` 403 Invalid origin mens et annet alias
 * virket bare fordi det tilfeldigvis var `BETTER_AUTH_URL`.
 * Lista skal navngi det vi kan peke på: produktvert + env Vercel allerede
 * setter. Ingen `*.vercel.app`.
 */

const OPPRINNELIG = { ...process.env };

afterEach(() => {
  process.env = { ...OPPRINNELIG };
});

const PROD = {
  NODE_ENV: 'production',
  VERCEL_ENV: 'production',
  BETTER_AUTH_URL: 'https://endwise.no',
} as const;

describe('authPublicUrl', () => {
  it('prod bruker BETTER_AUTH_URL (endwise.no)', () => {
    expect(authPublicUrl(PROD)).toBe('https://endwise.no');
  });

  it('preview foretrekker VERCEL_BRANCH_URL, ikke unik VERCEL_URL eller prod', () => {
    expect(
      authPublicUrl({
        NODE_ENV: 'production',
        VERCEL_ENV: 'preview',
        VERCEL_URL: 'endwise-v1-huyl0g1ly-endwise-twofold.vercel.app',
        VERCEL_BRANCH_URL:
          'endwise-v1-web-git-cursor-desktop-chrome-2b74-endwise-twofold.vercel.app',
        BETTER_AUTH_URL: 'https://endwise.no',
      }),
    ).toBe('https://endwise-v1-web-git-cursor-desktop-chrome-2b74-endwise-twofold.vercel.app');
  });

  it('preview uten branch-URL faller tilbake på VERCEL_URL, aldri prod', () => {
    expect(
      authPublicUrl({
        NODE_ENV: 'production',
        VERCEL_ENV: 'preview',
        VERCEL_URL: 'endwise-v1-web-git-feat-endwise.vercel.app',
        BETTER_AUTH_URL: 'https://endwise.no',
      }),
    ).toBe('https://endwise-v1-web-git-feat-endwise.vercel.app');
  });

  it('dev bruker BETTER_AUTH_URL / localhost', () => {
    expect(
      authPublicUrl({
        NODE_ENV: 'development',
        BETTER_AUTH_URL: 'http://localhost:3000',
      }),
    ).toBe('http://localhost:3000');
  });
});

describe('authTrustedOrigins', () => {
  it('prod-lista inneholder endwise.no og www', () => {
    const origins = authTrustedOrigins(PROD);
    expect(origins).toContain('https://endwise.no');
    expect(origins).toContain('https://www.endwise.no');
  });

  it('preview med VERCEL_URL inkluderer den hosten', () => {
    const host = 'endwise-v1-web-abc123.vercel.app';
    const origins = authTrustedOrigins({
      NODE_ENV: 'production',
      VERCEL_ENV: 'preview',
      VERCEL_URL: host,
      BETTER_AUTH_URL: 'https://endwise.no',
    });
    expect(origins).toContain(`https://${host}`);
    expect(origins).toContain('https://endwise.no');
  });

  it('prod inkluderer ikke et tilfeldig Vercel-alias som ikke står i env', () => {
    const origins = authTrustedOrigins({
      ...PROD,
      VERCEL_URL: 'endwise-v1-web-dplxyz.vercel.app',
    });
    expect(origins).toContain('https://endwise-v1-web-dplxyz.vercel.app');
    expect(origins).not.toContain('https://endwise-v1-web.vercel.app');
    expect(origins).not.toContain('https://tilfeldig-alias.vercel.app');
  });

  it('dev inkluderer fortsatt localhost', () => {
    const origins = authTrustedOrigins({
      NODE_ENV: 'development',
      BETTER_AUTH_URL: 'http://localhost:3000',
    });
    expect(origins).toContain('http://localhost:3000');
    expect(origins).toContain('http://127.0.0.1:3000');
  });

  it('prod inkluderer ikke localhost / LAN', () => {
    const origins = authTrustedOrigins(PROD);
    expect(origins.some((o) => o.includes('localhost'))).toBe(false);
    expect(origins.some((o) => o.includes('127.0.0.1'))).toBe(false);
  });

  it('⛔ jokertegn i env blir ikke betrodd', () => {
    const origins = authTrustedOrigins({
      ...PROD,
      VERCEL_URL: '*.vercel.app',
    });
    expect(origins).not.toContain('https://*.vercel.app');
    expect(origins.every((o) => !o.includes('*'))).toBe(true);
  });

  it('createAuth setter trustedOrigins også når NODE_ENV=production', () => {
    process.env.NODE_ENV = 'production';
    process.env.VERCEL_ENV = 'production';
    process.env.BETTER_AUTH_URL = 'https://endwise.no';
    process.env.BETTER_AUTH_SECRET = 'test-hemmelighet-som-er-lang-nok-til-alt';
    const auth = createAuth(createDb('postgres://ingen:ingen@127.0.0.1:1/ingen'));
    expect(auth.options.trustedOrigins).toEqual(
      expect.arrayContaining(['https://endwise.no', 'https://www.endwise.no']),
    );
    expect(auth.options.baseURL).toBe('https://endwise.no');
  });

  it('navngitte Vercel-env-verter kommer med når de er satt', () => {
    const origins = authTrustedOrigins({
      ...PROD,
      VERCEL_URL: 'endwise-v1-web-dplxyz.vercel.app',
      VERCEL_BRANCH_URL: 'endwise-v1-web-git-main-endwise.vercel.app',
      VERCEL_PROJECT_PRODUCTION_URL: 'endwise.no',
    });
    expect(origins).toContain('https://endwise-v1-web-dplxyz.vercel.app');
    expect(origins).toContain('https://endwise-v1-web-git-main-endwise.vercel.app');
    expect(origins).toContain('https://endwise.no');
  });
});
