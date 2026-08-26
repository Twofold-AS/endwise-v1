import { afterEach, describe, expect, it } from 'vitest';
import { QuickSsrfError } from '../src/errors.ts';
import { assertAllowedQuickUrl } from '../src/url-guard.ts';

/**
 * F8-01 / CWE-918 — ssrf-vern på brukerkonfigurert baseUrl. De farlige inputene
 * MÅ avvises; de legitime Quick-URL-ene MÅ slippe gjennom. Rene tester, ingen DB.
 */
afterEach(() => {
  delete process.env.QUICK_ALLOWED_HOST_SUFFIXES;
});

describe('assertAllowedQuickUrl — SSRF-vern', () => {
  it('slipper gjennom legitime Quick-URL-er', () => {
    expect(assertAllowedQuickUrl('https://q3.quick.no/ProdShared008').hostname).toBe('q3.quick.no');
    expect(assertAllowedQuickUrl('https://q3.quick.no/Test_Public')).toBeInstanceOf(URL);
    expect(assertAllowedQuickUrl('https://quick.no/x')).toBeInstanceOf(URL);
    expect(assertAllowedQuickUrl('https://q3.quick.no:443/x')).toBeInstanceOf(URL);
  });

  const blocked: [string, string][] = [
    ['http (ikke https)', 'http://q3.quick.no/x'],
    ['metadata-IP', 'https://169.254.169.254/latest/meta-data/'],
    ['loopback-IP', 'https://127.0.0.1/x'],
    ['privat-IP 10/8', 'https://10.0.0.5/x'],
    ['privat-IP 192.168', 'https://192.168.1.1/x'],
    ['IPv6 loopback', 'https://[::1]/x'],
    ['localhost', 'https://localhost/x'],
    ['fremmed domene', 'https://evil.example.com/x'],
    ['nesten-Quick (suffiks-spoof)', 'https://quick.no.evil.com/x'],
    ['credentials i URL', 'https://user:pass@q3.quick.no/x'],
    ['ikke-standard port', 'https://q3.quick.no:8080/x'],
    ['file-skjema', 'file:///etc/passwd'],
    ['søppel', 'ikke-en-url'],
  ];

  for (const [navn, url] of blocked) {
    it(`avviser: ${navn}`, () => {
      expect(() => assertAllowedQuickUrl(url)).toThrow(QuickSsrfError);
    });
  }

  it('respekterer QUICK_ALLOWED_HOST_SUFFIXES-overstyring', () => {
    process.env.QUICK_ALLOWED_HOST_SUFFIXES = 'quick.no,partner.example';
    expect(assertAllowedQuickUrl('https://api.partner.example/x')).toBeInstanceOf(URL);
    // Fortsatt blokkert: IP-literal selv med utvidet allowlist.
    expect(() => assertAllowedQuickUrl('https://10.0.0.5/x')).toThrow(QuickSsrfError);
  });
});
