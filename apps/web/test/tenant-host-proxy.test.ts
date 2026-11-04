import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { config, proxy } from '../proxy.ts';

const her = dirname(fileURLToPath(import.meta.url));

function req(url: string, host: string, extra?: HeadersInit): NextRequest {
  return new NextRequest(url, { headers: { host, ...extra } });
}

function rewriteDest(res: Response): string | null {
  const raw = res.headers.get('x-middleware-rewrite') ?? res.headers.get('x-nextjs-rewrite') ?? '';
  if (!raw) return null;
  try {
    return new URL(raw).pathname;
  } catch {
    return raw.startsWith('http') ? new URL(raw).pathname : raw;
  }
}

const WL = {} as const;

describe('F18 / white label F2: proxy vertsruting', () => {
  it('matcher dekker auth og øvrige sider (statisk unntatt)', () => {
    expect(config.matcher).toEqual(
      expect.arrayContaining([
        '/signin',
        '/signin/:path*',
        '/2fa-oppsett',
        '/2fa-oppsett/:path*',
        '/api/auth/:path*',
      ]),
    );
    expect(config.matcher.some((m) => m.includes('(?!_next/static'))).toBe(true);
  });

  it('auth-stier får no-store, marked får sone-header', () => {
    const auth = proxy(req('https://endwise.no/signin', 'endwise.no'), {});
    expect(auth.headers.get('Cache-Control')).toMatch(/no-store/);
    expect(auth.headers.get('x-endwise-sone')).toBe('marked');

    const hjem = proxy(req('https://endwise.no/home', 'endwise.no'), {});
    expect(hjem.headers.get('x-endwise-sone')).toBe('marked');
    expect(rewriteDest(hjem)).toBeNull();
  });

  it('forhandler / viser kundeside', () => {
    const res = proxy(req('https://bergen.endwise.no/', 'bergen.endwise.no'), WL);
    expect(res.headers.get('x-endwise-sone')).toBe('forhandler');
    expect(res.headers.get('x-endwise-slug')).toBe('bergen');
    expect(rewriteDest(res)).toBe('/_kunde/bergen');
  });

  it('forhandler /home uten Bedrift går til logg-inn', () => {
    const res = proxy(req('https://bergen.endwise.no/home', 'bergen.endwise.no'), WL);
    expect(rewriteDest(res)).toBe('/_kunde/bergen/logg-inn');
  });

  it('forhandler /home med ?kontekst=bedrift i preview går til (app)', () => {
    const res = proxy(req('https://bergen.endwise.no/home?kontekst=bedrift', 'bergen.endwise.no'), {
      ...WL,
      VERCEL_ENV: 'preview',
    });
    expect(res.headers.get('x-endwise-sone')).toBe('forhandler');
    expect(res.headers.get('x-endwise-kontekst') ?? res.headers.get('x-endwise-sone')).toBeTruthy();
    expect(rewriteDest(res)).toBeNull();
  });

  it('produksjon ignorerer ?kontekst=bedrift', () => {
    const res = proxy(req('https://bergen.endwise.no/home?kontekst=bedrift', 'bergen.endwise.no'), {
      ...WL,
      VERCEL_ENV: 'production',
    });
    expect(rewriteDest(res)).toBe('/_kunde/bergen/logg-inn');
  });

  it('ukjent slug og reservert vert gir nøytral 404', () => {
    const ukjent = proxy(req('https://verksted.no/', 'verksted.no'), WL);
    const admin = proxy(req('https://admin.endwise.no/', 'admin.endwise.no'), WL);
    expect(ukjent.headers.get('x-endwise-sone')).toBe('ukjent');
    expect(ukjent.headers.get('x-endwise-slug')).toBeNull();
    expect(rewriteDest(ukjent)).toBe('/_kunde/_ukjent');
    expect(admin.headers.get('x-endwise-sone')).toBe('reservert');
    expect(rewriteDest(admin)).toBe('/_kunde/_ukjent');
  });

  it('platform rewriter rot, admin-stier går videre, noindex', () => {
    const rot = proxy(req('https://platform.endwise.no/', 'platform.endwise.no'), WL);
    expect(rot.headers.get('x-endwise-sone')).toBe('platform');
    expect(rot.headers.get('X-Robots-Tag')).toMatch(/noindex/);
    expect(rewriteDest(rot)).toBe('/_plattform');

    const logg = proxy(req('https://platform.endwise.no/logg-inn', 'platform.endwise.no'), WL);
    expect(rewriteDest(logg)).toBe('/_plattform/logg-inn');

    const admin = proxy(req('https://platform.endwise.no/endwise', 'platform.endwise.no'), WL);
    expect(admin.headers.get('x-endwise-sone')).toBe('platform');
    expect(rewriteDest(admin)).toBeNull();
  });

  it('marked endwise.no er uendret', () => {
    const res = proxy(req('https://endwise.no/home', 'endwise.no'), WL);
    expect(res.headers.get('x-endwise-sone')).toBe('marked');
    expect(rewriteDest(res)).toBeNull();
  });

  it('proxy-kilden har ingen DB', () => {
    const src = readFileSync(resolve(her, '../proxy.ts'), 'utf8');
    expect(src).not.toMatch(/@endwise\/db/);
    expect(src).not.toMatch(/oppslag|createDb|lookup_tenant/);
    expect(src).toMatch(/ruteFraSone/);
  });
});
