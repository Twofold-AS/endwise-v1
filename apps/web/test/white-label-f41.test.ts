import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

const SAMME = 'Hvis kontoen finnes, får du en kode på e-post.';

describe('F41: endwise.no er bare marked', () => {
  it('roten er MarkedsSide uten sesjonsport', () => {
    const rot = les('../app/page.tsx');
    expect(rot).toMatch(/MarkedsSide/);
    expect(rot).not.toMatch(/getSession|SignInSkjema|organization\.setActive/);
  });

  it('marked-nav peker Logg inn til app, ikke /signin', () => {
    const chrome = les('../app/_markeds/markeds-chrome.tsx');
    expect(chrome).toMatch(/\$\{appOffentligUrl\(\)\}\/logg-inn/);
    expect(chrome).not.toMatch(/href=\{['"]\/signin['"]/);
  });

  it('bedrift, kunde og platform bruker samme nøytrale setning', () => {
    expect(les('../app/%5Fbedrift/logg-inn/_skjema.tsx')).toContain(SAMME);
    expect(les('../app/%5Fkunde/[slug]/logg-inn/logg-inn-skjema.tsx')).toContain(SAMME);
    expect(les('../app/%5Fplattform/logg-inn/_skjema.tsx')).toContain(SAMME);
    expect(les('../app/signin/signin-steg.ts')).toContain(SAMME);
  });

  it('kunde-innlogging bor på <sub> — aldri app.endwise.no', () => {
    const skjema = les('../app/%5Fkunde/[slug]/logg-inn/logg-inn-skjema.tsx');
    const proxy = les('../proxy.ts');
    const rute = les('../../../packages/modules/src/tenant-host/rute.ts');
    expect(skjema).toMatch(/callbackURL:\s*'\/min-side'/);
    expect(skjema).not.toMatch(/appOffentligUrl|app\.endwise\.no/);
    expect(proxy).toMatch(/lesKundeSlugFraSporsmal/);
    expect(rute).toMatch(/kundeSlug \?\? 'app'/);
    expect(rute).toMatch(/erKundeSti\(path\)/);
    expect(rute).toMatch(/type: 'not-found'/);
  });
});
