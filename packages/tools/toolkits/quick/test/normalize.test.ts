import { describe, expect, it } from 'vitest';
import {
  MAX_QUICK_TOKEN_LENGTH,
  normalizeQuickBaseUrl,
  normalizeQuickToken,
} from '../src/normalize.ts';

/**
 * Forhandler limer ofte inn Help/swagger-URL og
 * «Token token=…»-wrapper. Proben skal treffe origin + shop-slug.
 */
const SHOP = 'https://q3.quick.no/ProdShared008';

describe('normalizeQuickBaseUrl', () => {
  it('trimmer og fjerner trailing slash', () => {
    expect(normalizeQuickBaseUrl(`  ${SHOP}/  `)).toBe(SHOP);
    expect(normalizeQuickBaseUrl(`${SHOP}/`)).toBe(SHOP);
    expect(normalizeQuickBaseUrl(SHOP)).toBe(SHOP);
  });

  it('striper /api/v2 og alt bak, beholder origin + shop-slug', () => {
    expect(normalizeQuickBaseUrl(`${SHOP}/api/v2`)).toBe(SHOP);
    expect(normalizeQuickBaseUrl(`${SHOP}/api/v2/`)).toBe(SHOP);
    expect(normalizeQuickBaseUrl(`${SHOP}/api/v2/client/info`)).toBe(SHOP);
  });

  it('striper /Help… og /swagger… så docs-URL fortsatt virker', () => {
    expect(normalizeQuickBaseUrl(`${SHOP}/Help`)).toBe(SHOP);
    expect(normalizeQuickBaseUrl(`${SHOP}/Help/Api/GET-api-v2-client-info`)).toBe(SHOP);
    expect(normalizeQuickBaseUrl(`${SHOP}/swagger`)).toBe(SHOP);
    expect(normalizeQuickBaseUrl(`${SHOP}/swagger/index.html`)).toBe(SHOP);
    expect(normalizeQuickBaseUrl(`${SHOP}/Swagger/ui`)).toBe(SHOP);
  });

  it('tom etter trim blir tom streng', () => {
    expect(normalizeQuickBaseUrl('   ')).toBe('');
  });
});

describe('normalizeQuickToken', () => {
  it('trimmer nøkkelen', () => {
    expect(normalizeQuickToken('  abc123  ')).toBe('abc123');
  });

  it('striper Token token= og token= så vi ikke dobler wrapperen', () => {
    expect(normalizeQuickToken('Token token=abc123')).toBe('abc123');
    expect(normalizeQuickToken('token=abc123')).toBe('abc123');
    expect(normalizeQuickToken('  Token token=abc123  ')).toBe('abc123');
    expect(normalizeQuickToken('Token token=Token token=abc123')).toBe('abc123');
  });

  it('tom wrapper blir tom — ikke «Token token=» mot Quick', () => {
    expect(normalizeQuickToken('Token token=')).toBe('');
    expect(normalizeQuickToken('token=')).toBe('');
  });

  it('avviser token over maks lengde (ingen avkorting av nøkkel)', () => {
    expect(MAX_QUICK_TOKEN_LENGTH).toBeLessThanOrEqual(512);
    expect(normalizeQuickToken('a'.repeat(MAX_QUICK_TOKEN_LENGTH))).toHaveLength(
      MAX_QUICK_TOKEN_LENGTH,
    );
    expect(normalizeQuickToken('a'.repeat(MAX_QUICK_TOKEN_LENGTH + 1))).toBe('');
  });
});
