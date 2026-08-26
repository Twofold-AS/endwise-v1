import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * «Ny»-tekstbadge + rød teller i samme badge-form .
 * Låst kopi og form: synlig «New» på badge/pille er feil; uleste-tall skal
 * være `CountBadge` (`Badge variant="destructive"`, 20px/6px), ikke 18px-sirkel
 * og ikke grå/grønn pille.
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

describe('CountBadge er samme badge-form som Ny', () => {
  const cards = utenKommentarer(les('../app/(app)/_shell/cards.tsx'));
  const countBlokk = cards.slice(
    cards.indexOf('export function CountBadge'),
    cards.indexOf('export function CardShell'),
  );

  it('skjuler 0 og bruker Badge variant=destructive — ikke 18px-sirkel', () => {
    expect(countBlokk).toMatch(/if \(count <= 0\) return null/);
    expect(countBlokk).toMatch(/<Badge[\s\S]*?variant="destructive"/);
    expect(countBlokk).not.toMatch(/rounded-full/);
    expect(countBlokk).not.toMatch(/size-\[18px\]/);
    expect(countBlokk).not.toMatch(/h-\[18px\]/);
    expect(countBlokk).not.toMatch(/text-white/);
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

describe('NavRow: Ny først, teller i chevron-sporet uten barn', () => {
  const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
  const navRow = sidebar.slice(
    sidebar.indexOf('function NavRow'),
    sidebar.indexOf('function medFra'),
  );
  const innhold = navRow.slice(navRow.indexOf('const innhold'), navRow.indexOf('const radKlasse'));

  it('NewBadge kommer før telleren i radinnholdet (første merke etter label)', () => {
    const ny = innhold.indexOf('<NewBadge');
    const teller = innhold.indexOf('{teller}');
    expect(ny).toBeGreaterThan(-1);
    expect(teller).toBeGreaterThan(ny);
  });

  it('rader uten barn: CountBadge i høyre spor, ikke foran 14px-plassholder', () => {
    expect(navRow).toMatch(/const harBarn = children\.length > 0/);
    expect(navRow).toMatch(/<ChevronDown/);
    expect(navRow).toMatch(/w-3\.5/);
    expect(innhold).toMatch(/: count > 0 \? \(\s*teller\s*\) : \(\s*chevronPlass/);
  });

  it('rader med barn: chevron ytterst, teller før pilen', () => {
    expect(innhold).toMatch(/harBarn \?[\s\S]*\{teller\}[\s\S]*\{chevronPlass\}/);
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
