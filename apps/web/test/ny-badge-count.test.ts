import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * «Ny»-tekstbadge + rød teller-sirkel (24.08.2026).
 *
 * Låst kopi og form: synlig «New» på badge/pille er feil; uleste-tall skal
 * være `CountBadge` (rød sirkel, hvit tekst), ikke grå/grønn pille.
 */
const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

function tsxFiler(rot: string, acc: string[] = []): string[] {
  for (const navn of readdirSync(rot)) {
    const sti = join(rot, navn);
    if (statSync(sti).isDirectory()) tsxFiler(sti, acc);
    else if (/\.(tsx|ts)$/.test(navn)) acc.push(sti);
  }
  return acc;
}

describe('NewBadge er norsk «Ny»-tekstbadge', () => {
  const cards = utenKommentarer(les('../app/(app)/_shell/cards.tsx'));

  it('NewBadge viser Ny, ikke New', () => {
    expect(cards).toMatch(/<Badge variant="destructive"[^>]*>\s*Ny\s*<\/Badge>/);
    expect(cards).not.toMatch(/>\s*New\s*</);
  });

  it('tip-kort og helpdesk-artikler gjenbruker NewBadge', () => {
    const tip = utenKommentarer(les('../app/(app)/_shell/tip-card.tsx'));
    const support = utenKommentarer(les('../app/(app)/support/page.tsx'));
    expect(tip).toMatch(/<NewBadge/);
    expect(support).toMatch(/<NewBadge/);
    expect(tip).not.toMatch(/>\s*New\s*</);
    expect(support).not.toMatch(/>\s*New\s*</);
  });
});

describe('CountBadge er rød sirkel med hvitt siffer', () => {
  const cards = utenKommentarer(les('../app/(app)/_shell/cards.tsx'));
  const countBlokk = cards.slice(
    cards.indexOf('export function CountBadge'),
    cards.indexOf('export function CardShell'),
  );

  it('skjuler 0, er sirkel, bruker danger-token og hvit tekst', () => {
    expect(countBlokk).toMatch(/if \(count <= 0\) return null/);
    expect(countBlokk).toMatch(/rounded-full/);
    expect(countBlokk).toMatch(/bg-danger/);
    expect(countBlokk).toMatch(/text-white/);
    expect(countBlokk).not.toMatch(/bg-accent-soft/);
    expect(countBlokk).not.toMatch(/bg-success/);
  });

  it('nav, innboks og helpdesk-header bruker CountBadge — ikke grå pille', () => {
    const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
    const innboks = utenKommentarer(les('../app/(app)/innboks/_inbox-sidebar.tsx'));
    const support = utenKommentarer(les('../app/(app)/support/page.tsx'));
    expect(sidebar).toMatch(/<CountBadge/);
    expect(innboks).toMatch(/<CountBadge/);
    expect(support).toMatch(/<CountBadge/);
    expect(sidebar).not.toMatch(/bg-accent-soft text-accent-strong/);
    expect(innboks).not.toMatch(/bg-accent-soft[\s\S]*tabular-nums/);
  });
});

describe('ingen synlig New-badge i apps/web-UI', () => {
  it('ingen JSX-barn «New» i app-kilden', () => {
    const rot = resolve(her, '../app');
    const treff: string[] = [];
    for (const fil of tsxFiler(rot)) {
      const synlig = utenKommentarer(readFileSync(fil, 'utf8'));
      if (/>\s*New\s*</.test(synlig) || /['"`]New['"`]/.test(synlig)) {
        treff.push(fil.slice(rot.length + 1));
      }
    }
    expect(treff).toEqual([]);
  });
});
