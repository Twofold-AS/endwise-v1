import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  RONNY_SHEET_RADIUS_PX,
  RONNY_SHEET_SNAPS,
  ronnySheetEtterDra,
  ronnySheetHoydePx,
  synligViewportHoyde,
} from '../app/(app)/_workshop/ronny-sheet.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Ronny-sheet høyder — kun 80 og 100', () => {
  it('snap-listen er 80 og 100, uten peek', () => {
    expect(RONNY_SHEET_SNAPS).toEqual([80, 100]);
    expect(RONNY_SHEET_SNAPS).not.toContain(0);
    expect(RONNY_SHEET_SNAPS).not.toContain(36);
  });

  it('regner 80 % og 100 % av synlig høyde', () => {
    expect(ronnySheetHoydePx(80, 800)).toBe(640);
    expect(ronnySheetHoydePx(100, 800)).toBe(800);
    expect(ronnySheetHoydePx(80, 0)).toBe(0);
  });

  it('foretrekker visualViewport over rå fallback', () => {
    expect(synligViewportHoyde({ height: 640 }, 800)).toBe(640);
    expect(synligViewportHoyde(null, 800)).toBe(800);
    expect(synligViewportHoyde({ height: 0 }, 800)).toBe(800);
  });

  it('swipe ned lukker, tydelig swipe opp forstørrer, kort gest beholdes', () => {
    expect(ronnySheetEtterDra(40)).toBe('lukk');
    expect(ronnySheetEtterDra(-40)).toBe('forstor');
    expect(ronnySheetEtterDra(8)).toBe('behold');
    expect(ronnySheetEtterDra(-8)).toBe('behold');
  });

  it('topp-radius er 16', () => {
    expect(RONNY_SHEET_RADIUS_PX).toBe(16);
  });
});

describe('Telefon-toppbar — Jonas/Mikael sheet-fasit', () => {
  it('logo er midtstilt, ink, uten grønn logo-fil som Image', () => {
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    expect(shell).toMatch(/data-phone-top-bar/);
    expect(shell).toMatch(/data-shell-logo/);
    expect(shell).toMatch(/absolute inset-0/);
    expect(shell).toMatch(/justify-center/);
    expect(shell).toMatch(/bg-fg/);
    expect(shell).toMatch(/maskImage|WebkitMaskImage|mask-image/);
    expect(shell).not.toMatch(/<Image[\s\S]*logo\.svg/);
    expect(shell).not.toMatch(/#1ED27D/);
    expect(shell).not.toMatch(/text-title">Endwise</);
  });

  it('tilbake er kun pil med hale, uten synlig Tilbake-tekst', () => {
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    const pil = utenKommentarer(les('../app/(app)/_shell/tilbake-pil.tsx'));
    expect(shell).toMatch(/data-shell-tilbake/);
    expect(shell).toMatch(/aria-label="Tilbake"/);
    expect(shell).not.toMatch(/>Tilbake</);
    expect(shell).not.toMatch(/title="Tilbake"[\s\S]{0,80}Tilbake/);
    expect(pil).toMatch(/<svg/);
    expect(pil).toMatch(/strokeWidth="2"/);
    expect(pil).toMatch(/M19 12H5|M5 12h14/i);
    expect(pil).not.toMatch(/>Tilbake</);
    expect(pil).not.toMatch(/lucide|ChevronLeft/);
  });

  it('hjem skjuler tilbake-pilen', () => {
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    expect(shell).toMatch(/hjem \? null/);
  });

  it('toppbar- og desktop-avatar er levende Bloub, ikke still/heureux', () => {
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    const knapp = utenKommentarer(les('../app/(app)/_workshop/ronny-avatar-knapp.tsx'));
    const bot = utenKommentarer(les('../app/(app)/_workshop/ronny-bot.tsx'));
    expect(shell).toMatch(/RonnyBot/);
    expect(knapp).toMatch(/RonnyBot/);
    expect(shell).not.toMatch(/still/);
    expect(knapp).not.toMatch(/still/);
    expect(bot).toMatch(/still=\{false\}/);
    expect(bot).toMatch(/\bplaying\b/);
    expect(bot).not.toMatch(/playing=\{false\}/);
    expect(bot).toMatch(/heureux|colere|surpris/);
    const fab = utenKommentarer(les('../app/(app)/_workshop/workshop-bloub.tsx'));
    expect(fab).not.toMatch(/playing=\{false\}/);
  });

  it('høyre cluster er avatar rett til venstre for sidebar-toggle', () => {
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    const avatar = shell.indexOf('data-ronny-avatar');
    const toggle = shell.indexOf('data-phone-sidebar-open');
    expect(avatar).toBeGreaterThan(-1);
    expect(toggle).toBeGreaterThan(avatar);
    expect(shell).toMatch(/min-h-11|size-11/);
  });
});

describe('Ingen Ronny-stripe / peek — sheet kun på telefon', () => {
  it('workshop har ikke stripe, peek-dock eller Grainient', () => {
    const fab = utenKommentarer(les('../app/(app)/_workshop/workshop-bloub.tsx'));
    expect(fab).not.toMatch(/data-workshop-strip/);
    expect(fab).not.toMatch(/<Grainient/);
    expect(fab).not.toMatch(/data-ronny-peek/);
    expect(fab).not.toMatch(/PEEK_MAX|DOCK_KOMPAKT|visPeek/);
    expect(fab).not.toMatch(/Trykk på KI-Ronny/);
    expect(fab).not.toMatch(/<Galaxy/);
  });

  it('åpen Ronny er bunn-sheet med kun 80/100', () => {
    const fab = utenKommentarer(les('../app/(app)/_workshop/workshop-bloub.tsx'));
    expect(fab).toMatch(/data-ronny-sheet/);
    expect(fab).toMatch(/data-ronny-hoyde/);
    expect(fab).toMatch(/ronnySheetHoydePx/);
    expect(fab).toMatch(/md:hidden/);
    expect(fab).toMatch(/data-ronny-scrim/);
    expect(fab).toMatch(/data-ronny-forstor/);
    expect(fab).toMatch(/data-ronny-lukk/);
    expect(fab).not.toMatch(/setVisning\('stripe'\)|setVisning\('dock'\)/);
    expect(fab).not.toMatch(/visning === 'utvidet'/);
  });

  it('sheet-header er forstørr · Ronny · X, uten Galaxy/Grainient', () => {
    const fab = utenKommentarer(les('../app/(app)/_workshop/workshop-bloub.tsx'));
    const header = fab.slice(fab.indexOf('data-ronny-sheet-header'));
    expect(fab).toMatch(/data-ronny-sheet-header/);
    expect(header).toMatch(/Ronny/);
    expect(header.slice(0, 800)).not.toMatch(/Grainient|Galaxy/);
    expect(fab).toMatch(/aria-label="Forstørr"|aria-label="Full høyde"/);
    expect(fab).toMatch(/aria-label="Lukk"/);
  });

  it('desktop-sidebar: avatar rett til venstre for toggle, uten sheet', () => {
    const header = utenKommentarer(les('../app/(app)/_shell/sidebar-header.tsx'));
    const knapp = utenKommentarer(les('../app/(app)/_workshop/ronny-avatar-knapp.tsx'));
    expect(header).toMatch(/justify-between/);
    expect(header).toMatch(/data-shell-logo/);
    expect(header).toMatch(/RonnyAvatarKnapp/);
    expect(knapp).toMatch(/data-ronny-avatar/);
    expect(knapp).toMatch(/hidden md:inline-flex/);
    const cluster = header.slice(header.indexOf('const hoyre'));
    const avatar = cluster.indexOf('RonnyAvatarKnapp');
    const minimer = cluster.indexOf('{minimer}');
    expect(avatar).toBeGreaterThan(-1);
    expect(minimer).toBeGreaterThan(avatar);
    expect(header).not.toMatch(/data-ronny-sheet/);
  });
});

describe('Desktop Ronny — overlay-panel, ikke sheet', () => {
  it('høyre panel 400px med scrim, uten forstørr og handle', () => {
    const fab = utenKommentarer(les('../app/(app)/_workshop/workshop-bloub.tsx'));
    expect(fab).toMatch(/data-ronny-desktop-panel/);
    expect(fab).toMatch(/data-ronny-desktop-scrim/);
    expect(fab).toMatch(/data-ronny-desktop-header/);
    expect(fab).toMatch(/max-w-\[400px\]/);
    expect(fab).toMatch(/absolute inset-0/);
    expect(fab).toMatch(/hidden md:block/);
    const desktop = fab.slice(fab.indexOf('data-ronny-desktop-panel'));
    expect(desktop).toMatch(/data-ronny-lukk/);
    expect(desktop).toMatch(/Ronny/);
    expect(desktop).not.toMatch(/data-ronny-forstor/);
    expect(desktop).not.toMatch(/data-ronny-handtak/);
    expect(desktop).not.toMatch(/data-ronny-sheet/);
    expect(desktop.slice(0, 400)).not.toMatch(/Forstørr|Full høyde/);
  });

  it('telefon-sheet er urørt — 80/100, forstørr, handle, md:hidden', () => {
    const fab = utenKommentarer(les('../app/(app)/_workshop/workshop-bloub.tsx'));
    const sheet = fab.slice(fab.indexOf('data-ronny-sheet'), fab.indexOf('data-ronny-desktop'));
    expect(sheet).toMatch(/data-ronny-forstor/);
    expect(sheet).toMatch(/data-ronny-handtak/);
    expect(sheet).toMatch(/data-ronny-hoyde/);
    expect(fab).toMatch(/className="md:hidden"/);
  });
});
