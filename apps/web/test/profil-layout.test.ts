import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Mikael IA 28.08 kveld: Profil-identitet ut av CardShell.
 * Avatar + endre-knapp er søsken øverst. Navn, kallenavn og e-post
 * stables nedover — ikke i det gamle kortet og ikke i en to-kolonne-rute
 * ved siden av ansiktet.
 */
const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Profil: avatar og felt ut av det gamle kortet', () => {
  const fane = utenKommentarer(les('../app/(app)/innstillinger/_profil-fane.tsx'));
  const velger = utenKommentarer(les('../app/(app)/_avatar/avatar-velger.tsx'));

  it('avatar og endre-knapp er søsken i samme rad øverst', () => {
    const merke = 'flex flex-row items-center gap-4';
    const start = velger.indexOf(merke);
    const rad = velger.slice(start, velger.indexOf('</div>', start));
    expect(rad).toMatch(/<Avatar/);
    expect(rad).toMatch(/\{nyTilfeldigKnapp\}/);
    expect(rad).not.toMatch(/children/);
    expect(rad.indexOf('<Avatar')).toBeLessThan(rad.indexOf('{nyTilfeldigKnapp}'));
  });

  it('profil-feltene ligger ikke i AvatarVelger eller CardShell', () => {
    expect(fane).toMatch(/<AvatarVelger[^>]*utenKort/);
    expect(fane).toMatch(/<AvatarVelger[^>]*\/>/);
    expect(fane).not.toMatch(/<AvatarVelger[\s\S]*?<\/AvatarVelger>/);
    expect(fane).not.toMatch(/sm:grid-cols-2/);

    const etterAvatar = fane.slice(fane.indexOf('<AvatarVelger'));
    expect(etterAvatar).toMatch(/VisningsnavnFelt/);
    expect(etterAvatar).toMatch(/KallenavnFelt/);
    expect(etterAvatar).toMatch(/aria-label="E-post"|E-post/);
    expect(etterAvatar.indexOf('VisningsnavnFelt')).toBeLessThan(
      etterAvatar.indexOf('KallenavnFelt'),
    );
    expect(etterAvatar.indexOf('KallenavnFelt')).toBeLessThan(etterAvatar.indexOf('E-post'));
  });

  it('feltene stables ett og ett, ikke i en gruppert identitetsboks', () => {
    const jsx = fane.slice(fane.indexOf('return ('));
    expect(jsx).toMatch(/<VisningsnavnFelt/);
    expect(jsx).toMatch(/<KallenavnFelt/);
    expect(jsx.indexOf('<VisningsnavnFelt')).toBeLessThan(jsx.indexOf('<KallenavnFelt'));
    expect(jsx.indexOf('<KallenavnFelt')).toBeLessThan(jsx.indexOf('E-post'));
    expect(jsx).not.toMatch(/<KallenavnSeksjon/);
    expect(jsx).not.toMatch(/<VisningsnavnSeksjon/);
    expect(jsx).not.toMatch(/sm:grid-cols-2|sm:col-span-2/);
  });
});
