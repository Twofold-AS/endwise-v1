import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb } from '@endwise/db';
import { describe, expect, it } from 'vitest';
import { createAuth } from '../src/auth.ts';
import {
  erAppEllerPlatformHost,
  forhandlerOffentligUrl,
  gyldigForhandlerSlug,
  kundelenkePaaForhandler,
} from '../src/sone.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('F41: kunder aldri til app.endwise.no', () => {
  it('forhandlerOffentligUrl er <sub>.endwise.no — ikke app/platform', () => {
    expect(forhandlerOffentligUrl('bergen')).toBe('https://bergen.endwise.no');
    expect(forhandlerOffentligUrl('app')).toBeNull();
    expect(forhandlerOffentligUrl('platform')).toBeNull();
    expect(forhandlerOffentligUrl('www')).toBeNull();
    expect(gyldigForhandlerSlug('bergen')).toBe(true);
    expect(gyldigForhandlerSlug('app')).toBe(false);
  });

  it('kundelenkePaaForhandler flytter verify til sub, aldri app', () => {
    const raw =
      'https://app.endwise.no/api/auth/magic-link/verify?token=12345&callbackURL=%2Fmin-side';
    const ut = kundelenkePaaForhandler(raw, 'bergen');
    expect(ut).toBe(
      'https://bergen.endwise.no/api/auth/magic-link/verify?token=12345&callbackURL=%2Fmin-side',
    );
    expect(ut).not.toMatch(/app\.endwise\.no/);
    expect(kundelenkePaaForhandler(raw, 'app')).toBeNull();
    expect(erAppEllerPlatformHost('app.endwise.no')).toBe(true);
    expect(erAppEllerPlatformHost('bergen.endwise.no')).toBe(false);
  });

  it('createAuth forhandler+slug har baseURL på kundeverten', () => {
    process.env.BETTER_AUTH_URL = 'https://endwise.no';
    process.env.BETTER_AUTH_SECRET = 'x'.repeat(32);
    const auth = createAuth(createDb('postgres://ingen:ingen@127.0.0.1:1/ingen'), {
      sone: 'forhandler',
      slug: 'bergen',
    });
    expect(auth.options.baseURL).toBe('https://bergen.endwise.no');
    expect(auth.options.baseURL).not.toMatch(/app\.endwise\.no/);
  });

  it('kunde-innlogging og velkomst peker på <sub>, ikke app', () => {
    const kunde = les('../../../apps/api/src/trpc/routers/kunde.ts');
    const velkomst = les('../src/senders/velkomst.ts');
    const auth = les('../src/auth.ts');
    expect(kunde).toMatch(/sone:\s*'forhandler'/);
    expect(kunde).toMatch(/callbackURL:\s*'\/min-side'/);
    expect(kunde).toMatch(/x-endwise-slug/);
    expect(kunde).not.toMatch(/appOffentligUrl|app\.endwise\.no/);
    expect(velkomst).toMatch(/forhandlerOffentligUrl/);
    expect(velkomst).toMatch(/ingen_slug/);
    expect(velkomst).not.toMatch(/https:\/\/\$\{rot\}|appOffentligUrl/);
    expect(auth).toMatch(/kundelenkePaaForhandler/);
    expect(auth).toMatch(/sone === 'forhandler'/);
  });
});
