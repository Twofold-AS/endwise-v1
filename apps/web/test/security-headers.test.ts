import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  AUTH_NO_STORE,
  CSP_REPORT_GRUPPE,
  CSP_REPORT_STI,
  HSTS_VERDI,
  innholdssikkerhetsPolicy,
  sentryErEu,
  sentryIngestFraDsn,
  sikkerhetsHeadere,
  tillatelsesPolicy,
  WIDGET_API_KILDE,
} from '../lib/security-headers.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string): string {
  return readFileSync(resolve(her, rel), 'utf8');
}

const CSP_PROD =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://demotiles.maplibre.org; worker-src 'self' blob:; child-src 'self' blob:; manifest-src 'self'; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-src 'none'; frame-ancestors 'none'; upgrade-insecure-requests; report-to csp-endpoint";

const CSP_DEV =
  "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://demotiles.maplibre.org; worker-src 'self' blob:; child-src 'self' blob:; manifest-src 'self'; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-src 'none'; frame-ancestors 'none'; upgrade-insecure-requests; report-to csp-endpoint";

describe('sikkerhetsheadere (F0-15)', () => {
  it('CSP-policy er eksakt (prod uten DSN)', () => {
    expect(innholdssikkerhetsPolicy({ development: false, sentryDsn: '' })).toBe(CSP_PROD);
    expect(innholdssikkerhetsPolicy({ development: true, sentryDsn: '' })).toBe(CSP_DEV);
    expect(CSP_PROD).not.toContain('*.sentry.io');
    expect(CSP_PROD).not.toContain('mistral.ai');
    expect(CSP_PROD).not.toContain('unsafe-eval');
  });

  it('connect-src bruker konkret Sentry-ingest-host fra DSN, ikke *.sentry.io', () => {
    const euDsn = 'https://abc@o1.ingest.de.sentry.io/2';
    const usDsn = 'https://abc@o1.ingest.sentry.io/2';
    expect(sentryIngestFraDsn(euDsn)).toBe('o1.ingest.de.sentry.io');
    expect(sentryErEu('o1.ingest.de.sentry.io')).toBe(true);
    expect(sentryErEu(sentryIngestFraDsn(usDsn))).toBe(false);
    const csp = innholdssikkerhetsPolicy({ development: false, sentryDsn: euDsn });
    expect(csp).toContain('https://o1.ingest.de.sentry.io');
    expect(csp).not.toContain('*.sentry.io');
    expect(csp).toContain(`report-to ${CSP_REPORT_GRUPPE}`);
  });

  it('HSTS preload kun utenfor development, report-to og aldri ACAO *', () => {
    const prod = Object.fromEntries(
      sikkerhetsHeadere({ development: false, sentryDsn: '' }).map((h) => [h.key, h.value]),
    );
    const dev = Object.fromEntries(
      sikkerhetsHeadere({ development: true, sentryDsn: '' }).map((h) => [h.key, h.value]),
    );
    expect(prod['Content-Security-Policy']).toBe(CSP_PROD);
    expect(prod['Strict-Transport-Security']).toBe(HSTS_VERDI);
    expect(HSTS_VERDI).toBe('max-age=63072000; includeSubDomains; preload');
    expect(dev['Strict-Transport-Security']).toBeUndefined();
    expect(prod['Reporting-Endpoints']).toBe(`${CSP_REPORT_GRUPPE}="${CSP_REPORT_STI}"`);
    expect(prod['X-Frame-Options']).toBe('DENY');
    expect(prod['X-Content-Type-Options']).toBe('nosniff');
    expect(prod['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(prod['Permissions-Policy']).toBe(tillatelsesPolicy());
    expect(prod['Access-Control-Allow-Origin']).toBeUndefined();
    expect(JSON.stringify(sikkerhetsHeadere({ development: false }))).not.toContain(
      'Access-Control-Allow-Origin',
    );
  });

  it('next.config headers() setter no-store på /signin og /2fa-oppsett', () => {
    const cfg = les('../next.config.ts');
    expect(cfg).toMatch(/from '\.\/lib\/security-headers\.ts'/);
    expect(cfg).toMatch(/sikkerhetsHeadere\(/);
    expect(cfg).toMatch(/AUTH_NO_STORE/);
    expect(cfg).toMatch(/source:\s*'\/:path\*'/);
    expect(cfg).toMatch(/source:\s*'\/signin'/);
    expect(cfg).toMatch(/source:\s*'\/signin\/:path\*'/);
    expect(cfg).toMatch(/source:\s*'\/2fa-oppsett'/);
    expect(cfg).toMatch(/source:\s*'\/2fa-oppsett\/:path\*'/);
    expect(AUTH_NO_STORE).toBe('private, no-store, no-cache, must-revalidate');
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
  const rules = les('../../../.zap/rules.tsv');
  const app = les('../../api/src/app.ts');

  it('ZAP 10015/10055/10098 er WARN, header-regler FAIL, og -I hindrer WARN-rød', () => {
    expect(security).toMatch(/fail_action:\s*true/);
    expect(security).toMatch(/cmd_options:\s*'-I'/);
    expect(security).toMatch(/rules_file_name:\s*\.zap\/rules\.tsv/);
    expect(security).not.toMatch(/actions:\s*write/);
    expect(security).toMatch(/allow_issue_writing:\s*false/);
    expect(rules).toMatch(/^10020\tFAIL/m);
    expect(rules).toMatch(/^10021\tFAIL/m);
    expect(rules).toMatch(/^10038\tFAIL/m);
    expect(rules).toMatch(/^10063\tFAIL/m);
    expect(rules).toMatch(/^10015\tWARN/m);
    expect(rules).toMatch(/^10055\tWARN/m);
    expect(rules).toMatch(/^10098\tWARN/m);
    expect(rules).not.toMatch(/^10015\tIGNORE/m);
    expect(rules).not.toMatch(/^10055\tIGNORE/m);
    expect(rules).not.toMatch(/^10098\tIGNORE/m);
  });

  it('ci.yml har permissions: contents: read', () => {
    expect(ci).toMatch(/^permissions:\n {2}contents: read/m);
  });

  it('Hono secureHeaders har CSP default-src none + frame-ancestors none', () => {
    expect(app).toMatch(/contentSecurityPolicy:\s*\{/);
    expect(app).toMatch(/defaultSrc:\s*\["'none'"\]/);
    expect(app).toMatch(/frameAncestors:\s*\["'none'"\]/);
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
