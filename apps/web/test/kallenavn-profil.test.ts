import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Kallenavn i Settings › Profil og chrome.
 * Mikael: ett identitetsblokk (visningsnavn · kallenavn · e-post),
 * feltet lagrer for alle roller via `member_profiles.nickname`, og chrome
 * viser intern visning (kallenavn, ellers visningsnavn).
 */
const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Profil: kallenavn i samme identitetsblokk som visningsnavn og e-post', () => {
  const fane = utenKommentarer(les('../app/(app)/innstillinger/_profil-fane.tsx'));
  const kort = utenKommentarer(les('../app/(app)/_shell/profil-kort.tsx'));

  it('feltet sitter inne i AvatarVelger sammen med visningsnavn og e-post', () => {
    const barn = fane.slice(fane.indexOf('<AvatarVelger'), fane.indexOf('</AvatarVelger>'));
    expect(barn).toMatch(/VisningsnavnFelt/);
    expect(barn).toMatch(/KallenavnFelt/);
    expect(barn).toMatch(/aria-label="E-post"|E-post/);
    expect(barn.indexOf('VisningsnavnFelt')).toBeLessThan(barn.indexOf('KallenavnFelt'));
    expect(barn.indexOf('KallenavnFelt')).toBeLessThan(barn.indexOf('E-post'));
    expect(fane).not.toMatch(/<KallenavnSeksjon/);
  });

  it('kallenavn er et ekte felt for alle — ikke en død merknad for admin', () => {
    expect(kort).toMatch(/export function KallenavnFelt/);
    expect(kort).toMatch(/profile\.setNickname/);
    expect(kort).toMatch(/aria-label="Kallenavn"/);
    expect(kort).not.toMatch(/forhandlerens offisielle konto/);
    expect(kort).not.toMatch(/if \(!d\.kanHaKallenavn\)/);
  });
});

describe('Chrome: kort navn er intern visning (kallenavn, ellers visningsnavn)', () => {
  it('session.me.internNavn er chrome-kilden, med visningsnavn som fallback', () => {
    const hook = utenKommentarer(les('../app/(app)/_lib/use-org-role.ts'));
    const session = les('../../api/src/trpc/routers/session.ts');
    expect(hook).toMatch(/internNavn/);
    expect(session).toMatch(/internNavn:\s*visningsnavn\(/);
    expect(session).toMatch(/navn:\s*bruker\?\.name/);
    expect(session).not.toMatch(/navn: mech\?\.name \?\? ''/);
  });
});
