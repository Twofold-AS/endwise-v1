import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Kallenavn i Settings › Profil og chrome.
 * Mikael: visningsnavn · kallenavn · e-post stables under avataren,
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

describe('Profil: kallenavn stables med visningsnavn og e-post under avataren', () => {
  const fane = utenKommentarer(les('../app/(app)/innstillinger/_profil-fane.tsx'));
  const kort = utenKommentarer(les('../app/(app)/_shell/profil-kort.tsx'));

  it('feltet stables under avataren sammen med visningsnavn og e-post, ikke i kortet', () => {
    const jsx = fane.slice(fane.indexOf('return ('));
    expect(jsx).toMatch(/<AvatarVelger[^>]*utenKort/);
    expect(jsx).not.toMatch(/<AvatarVelger[\s\S]*?<\/AvatarVelger>/);
    expect(jsx.indexOf('<AvatarVelger')).toBeLessThan(jsx.indexOf('<VisningsnavnFelt'));
    expect(jsx.indexOf('<VisningsnavnFelt')).toBeLessThan(jsx.indexOf('<KallenavnFelt'));
    expect(jsx.indexOf('<KallenavnFelt')).toBeLessThan(jsx.indexOf('E-post'));
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
