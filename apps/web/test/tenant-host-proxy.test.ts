import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { config, proxy } from '../proxy.ts';

function req(url: string, host: string, extra?: HeadersInit): NextRequest {
  return new NextRequest(url, { headers: { host, ...extra } });
}

describe('F16 / white label F0: proxy tenant-host', () => {
  it('matcher er uendret — bare auth-stier', () => {
    expect(config.matcher).toEqual([
      '/signin',
      '/signin/:path*',
      '/2fa-oppsett',
      '/2fa-oppsett/:path*',
      '/api/auth/:path*',
    ]);
  });

  it('uten flagg: no-store, ingen sone-header (dagens atferd)', async () => {
    const res = proxy(req('https://endwise.no/signin', 'endwise.no'), {});
    expect(res.headers.get('Cache-Control')).toMatch(/no-store/);
    expect(res.headers.get('x-endwise-sone')).toBeNull();
    expect(res.headers.get('x-endwise-slug')).toBeNull();
  });

  it('med flagg: bergen.endwise.no → forhandler, uten rewrite', () => {
    const res = proxy(req('https://bergen.endwise.no/signin', 'bergen.endwise.no'), {
      ENDWISE_WHITE_LABEL_SPIKE: '1',
    });
    expect(res.headers.get('Cache-Control')).toMatch(/no-store/);
    expect(res.headers.get('x-endwise-sone')).toBe('forhandler');
    expect(res.headers.get('x-endwise-slug')).toBe('bergen');
    expect(res.status).toBe(200);
  });

  it('med flagg: platform og reservert admin gir sone uten slug', () => {
    const platform = proxy(req('https://platform.endwise.no/signin', 'platform.endwise.no'), {
      ENDWISE_WHITE_LABEL_SPIKE: '1',
    });
    const admin = proxy(req('https://admin.endwise.no/signin', 'admin.endwise.no'), {
      ENDWISE_WHITE_LABEL_SPIKE: '1',
    });
    expect(platform.headers.get('x-endwise-sone')).toBe('platform');
    expect(platform.headers.get('x-endwise-slug')).toBeNull();
    expect(admin.headers.get('x-endwise-sone')).toBe('reservert');
    expect(admin.headers.get('x-endwise-slug')).toBeNull();
  });

  it('med flagg: innkommende x-endwise-slug strippes (ikke klientstyrt)', () => {
    const res = proxy(
      req('https://endwise.no/signin', 'endwise.no', { 'x-endwise-slug': 'stjålet' }),
      { ENDWISE_WHITE_LABEL_SPIKE: '1' },
    );
    expect(res.headers.get('x-endwise-sone')).toBe('marked');
    expect(res.headers.get('x-endwise-slug')).toBeNull();
  });
});
