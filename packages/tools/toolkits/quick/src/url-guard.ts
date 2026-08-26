import { QuickSsrfError } from './errors.ts';

/**
 * F8-01 / CWE-918 — ssrf-vern for den brukerkonfigurerte `baseUrl`.
 * Trusselen: dealer_admin skriver inn Quick-instansens URL, og vi gjør utgående
 * requests mot den. Uten kontroll kan en ondsinnet/kompromittert admin peke den
 * mot interne mål — skyens metadata-tjeneste (169.254.169.254), `localhost`,
 * RFC1918 (10/8, 172.16/12, 192.168/16), link-local, osv. Dette er delt
 * Endwise-infra, ikke tenant-scopet, så det er et plattform-angrep.
 * Kontroller (defense-in-depth):
 * 1. Kun `https:` (ingen http/file/gopher/…).
 * 2. Ingen credentials i URL (`user:pass@host`).
 * 3. Host kan ikke være et IP-literal eller `localhost` (stopper direkte
 * Imds/loopback selv om allowlisten skulle utvides).
 * 4. Host MÅ matche en allowlist av domene-suffiks (default `quick.no` →
 * `quick.no` og `*.quick.no`). Overstyrbart via `QUICK_ALLOWED_HOST_SUFFIXES`.
 * 5. Kun standardport (tom eller 443) — hindrer intern portmålretting.
 * Kall dette både ved lagring (setConfig) og før hver fetch i klienten.
 * Restrisiko (dokumentert): DNS-rebinding der `*.quick.no` resolver til en intern
 * IP krever at Quicks DNS er kompromittert — utenfor dealer-admin-trusselmodellen.
 * `redirect: 'error'` i klienten stopper 3xx-omdirigering til ny host.
 */

const DEFAULT_ALLOWED_SUFFIXES = ['quick.no'];

function allowedSuffixes(): string[] {
  const raw = process.env.QUICK_ALLOWED_HOST_SUFFIXES;
  if (!raw) return DEFAULT_ALLOWED_SUFFIXES;
  const list = raw
    .split(',')
    .map((s) => s.trim().toLowerCase().replace(/^\.+/, ''))
    .filter(Boolean);
  return list.length > 0 ? list : DEFAULT_ALLOWED_SUFFIXES;
}

/** Grov, men trygg deteksjon av IP-literal-verter (IPv4/IPv6, inkl. bracket-form). */
function isIpLiteral(hostname: string): boolean {
  if (hostname.startsWith('[')) return true; // [::1], [fe80::…]
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true; // 169.254.169.254
  if (hostname.includes(':')) return true; // bar IPv6
  return false;
}

/**
 * Validerer og normaliserer en Quick-baseUrl. Kaster `QuickSsrfError` hvis den
 * ikke er trygg. Returnerer den parsede URL-en ved suksess.
 */
export function assertAllowedQuickUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new QuickSsrfError('Ugyldig baseUrl');
  }

  if (url.protocol !== 'https:') {
    throw new QuickSsrfError('baseUrl må bruke https');
  }
  if (url.username || url.password) {
    throw new QuickSsrfError('baseUrl kan ikke inneholde brukernavn/passord');
  }

  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) {
    throw new QuickSsrfError('baseUrl kan ikke peke på localhost');
  }
  if (isIpLiteral(host)) {
    throw new QuickSsrfError('baseUrl kan ikke være en IP-adresse — bruk Quick-domenet');
  }

  const suffixes = allowedSuffixes();
  const ok = suffixes.some((s) => host === s || host.endsWith(`.${s}`));
  if (!ok) {
    throw new QuickSsrfError(
      `baseUrl-domenet er ikke tillatt (må være ${suffixes.map((s) => `*.${s}`).join(' / ')})`,
    );
  }

  if (url.port !== '' && url.port !== '443') {
    throw new QuickSsrfError('baseUrl kan kun bruke standard https-port (443)');
  }

  return url;
}
