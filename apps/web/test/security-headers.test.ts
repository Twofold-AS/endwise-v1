import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  innholdssikkerhetsPolicy,
  sikkerhetsHeadere,
  tillatelsesPolicy,
  WIDGET_API_KILDE,
} from '../lib/security-headers.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string): string {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('sikkerhetsheadere (F0-15)', () => {
  it('setter CSP med frame-ancestors none og uten Mistral-klientkall', () => {
    const csp = innholdssikkerhetsPolicy({ development: false });
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("frame-src 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain('https://demotiles.maplibre.org');
    expect(csp).toContain('https://*.ingest.sentry.io');
    expect(csp).not.toContain('mistral.ai');
    expect(csp).not.toContain('unsafe-eval');
    expect(innholdssikkerhetsPolicy({ development: true })).toContain("'unsafe-eval'");
  });

  it('setter clickjacking-vern, nosniff, referrer og permissions — aldri ACAO *', () => {
    const keys = Object.fromEntries(sikkerhetsHeadere().map((h) => [h.key, h.value]));
    expect(keys['X-Frame-Options']).toBe('DENY');
    expect(keys['X-Content-Type-Options']).toBe('nosniff');
    expect(keys['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(keys['Permissions-Policy']).toBe(tillatelsesPolicy());
    expect(keys['Permissions-Policy']).toContain('camera=()');
    expect(keys['Permissions-Policy']).toContain('geolocation=()');
    expect(keys['Access-Control-Allow-Origin']).toBeUndefined();
    expect(JSON.stringify(sikkerhetsHeadere())).not.toContain('Access-Control-Allow-Origin');
  });

  it('next.config headers() bruker sikkerhetsHeadere på hele appen', () => {
    const cfg = les('../next.config.ts');
    expect(cfg).toMatch(/from '\.\/lib\/security-headers\.ts'/);
    expect(cfg).toMatch(/sikkerhetsHeadere\(/);
    expect(cfg).toMatch(/source:\s*'\/:path\*'/);
    expect(cfg).toMatch(/private, no-store, no-cache, must-revalidate/);
    expect(cfg).not.toMatch(/Access-Control-Allow-Origin['"]\s*,\s*value:\s*['"]\*/);
  });

  it('widget-ruter er JSON-API (CORS), ikke iframe-HTML som skal allow-frames', () => {
    const route = les('../app/widget/[[...path]]/route.ts');
    expect(route).toMatch(/handleHono/);
    expect(route).toMatch(/Offentlig `\/widget\/\*`/);
    expect(route).not.toMatch(/<html|iframe|frame-ancestors/);
    expect(WIDGET_API_KILDE).toBe('/widget/:path*');
    const embed = les('../app/(app)/butikk/_booking-widget.tsx');
    expect(embed).toMatch(/from '@endwise\/widget-ui'/);
    expect(embed).not.toMatch(/iframe/i);
  });
});

describe('CI-kontrakt (F0-15)', () => {
  const security = les('../../../.github/workflows/security.yml');
  const ci = les('../../../.github/workflows/ci.yml');

  it('ZAP er blokkerende og uten actions: write', () => {
    expect(security).toMatch(/fail_action:\s*true/);
    expect(security).toMatch(/rules_file_name:\s*\.zap\/rules\.tsv/);
    expect(security).not.toMatch(/actions:\s*write/);
    expect(security).toMatch(/allow_issue_writing:\s*false/);
    const rules = les('../../../.zap/rules.tsv');
    expect(rules).toMatch(/^10020\tFAIL/m);
    expect(rules).toMatch(/^10021\tFAIL/m);
    expect(rules).toMatch(/^10038\tFAIL/m);
    expect(rules).toMatch(/^10063\tFAIL/m);
    expect(rules).toMatch(/^10098\tIGNORE/m);
  });

  it('Actions er pinnet til 40-tegns SHA, ikke floating tag/main', () => {
    const uses = `${security}\n${ci}`.match(/uses:\s+\S+/g) ?? [];
    expect(uses.length).toBeGreaterThan(8);
    for (const line of uses) {
      expect(line, line).toMatch(/@[0-9a-f]{40}$/);
    }
    expect(security).not.toMatch(/Dependency-Check_Action@main\b/);
  });
});
