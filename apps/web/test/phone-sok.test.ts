import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { destinasjonerForShell } from '../app/(app)/_shell/nav.ts';
import { PHONE_AVATAR_PX, PHONE_LOGO_PX, SHELL_LOGO_PX } from '../app/(app)/_shell/phone-chrome.ts';
import { huskSok, lesNyligeSok, PHONE_SOK_MAX } from '../app/(app)/_shell/phone-sok.ts';
import { RONNY_IDLE, RONNY_PHONE_IDLE } from '../app/(app)/_workshop/ronny-idle.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Mikael telefon-chrome — mindre søk/avatar + søk-overlay (07.09 kveld)', () => {
  it('søk, Ronny og profil-sirkel er merkbart mindre enn 40px og like store', () => {
    expect(PHONE_AVATAR_PX).toBeLessThan(40);
    expect(PHONE_AVATAR_PX).toBeGreaterThanOrEqual(24);
    expect(PHONE_AVATAR_PX).toBeLessThanOrEqual(32);
    const chrome = utenKommentarer(les('../app/(app)/_shell/phone-chrome.ts'));
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    expect(chrome).toMatch(/PHONE_AVATAR_PX = 28/);
    expect(shell).toMatch(/size-7|h-7|h-8/);
    expect(shell).not.toMatch(/className="h-10 w-full rounded-sm/);
    expect(shell).toMatch(/PHONE_AVATAR_PX/);
    expect(shell).toMatch(/data-phone-profile/);
    expect(shell).toMatch(/data-ronny-avatar/);
  });

  it('telefon-logo er noe større enn desktop-merket; søk/Ronny/profil forblir små', () => {
    expect(PHONE_LOGO_PX).toBeGreaterThan(SHELL_LOGO_PX);
    expect(PHONE_LOGO_PX).toBeGreaterThan(PHONE_AVATAR_PX);
    expect(PHONE_LOGO_PX).toBeLessThanOrEqual(36);
    expect(PHONE_AVATAR_PX).toBe(28);
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    expect(shell).toMatch(/PHONE_LOGO_PX/);
    expect(shell).toMatch(/h-8/);
  });

  it('telefon-avatar sykler aldri colere/sint — kun rolige uttrykk', () => {
    expect(RONNY_PHONE_IDLE).not.toContain('colere');
    expect(RONNY_PHONE_IDLE).toEqual(expect.arrayContaining(['heureux', 'curieux', 'surpris', 'wink']));
    expect(RONNY_IDLE).not.toContain('colere');
    expect(RONNY_IDLE).toEqual(expect.arrayContaining(['heureux', 'curieux', 'surpris', 'wink']));
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    const bot = utenKommentarer(les('../app/(app)/_workshop/ronny-bot.tsx'));
    expect(shell).toMatch(/RONNY_PHONE_IDLE|idleSett|variant=["']chrome["']/);
    expect(bot).toMatch(/RONNY_PHONE_IDLE/);
    expect(bot).toMatch(/playing=\{false\}/);
    expect(bot).not.toMatch(/state=["']thinking["']/);
  });

  it('nylige søk huskes sist-først uten duplikat, maks PHONE_SOK_MAX', () => {
    expect(lesNyligeSok(null)).toEqual([]);
    expect(lesNyligeSok('ikke-json')).toEqual([]);
    expect(huskSok([], '  Timeplan  ')).toEqual(['Timeplan']);
    expect(huskSok(['Timeplan', 'Kunder'], 'timeplan')).toEqual(['timeplan', 'Kunder']);
    const lang = huskSok(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], 'ny');
    expect(lang[0]).toBe('ny');
    expect(lang).toHaveLength(PHONE_SOK_MAX);
  });

  it('søk-overlay: Avbryt, dest-ikonstripe og kategoriserte treff', () => {
    const overlay = utenKommentarer(les('../app/(app)/_shell/phone-sok-overlay.tsx'));
    const felt = utenKommentarer(les('../app/(app)/_shell/phone-sok-felt.tsx'));
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    expect(shell).toMatch(/data-phone-search-overlay|PhoneSokOverlay/);
    expect(overlay).toMatch(/data-phone-search-overlay/);
    expect(overlay).toMatch(/Avbryt/);
    expect(overlay).toMatch(/data-phone-sok-nylig/);
    expect(overlay).toMatch(/data-phone-sok-dest-ikon/);
    expect(overlay).toMatch(/data-phone-sok-dest-stripe/);
    expect(overlay).not.toMatch(/data-phone-sok-dest-rad/);
    expect(overlay).toMatch(/data-phone-sok-gruppe/);
    expect(felt).toMatch(/ew-felt/);
    expect(felt).not.toMatch(/absolute top-1\/2/);
    expect(overlay).not.toMatch(/accent-pip|border-l-/);
    expect(
      destinasjonerForShell({ shell: 'forhandler', role: null, shopEnabled: false }).length,
    ).toBeGreaterThan(4);
  });
});

describe('Mikael Ronny-sheet — kompakt etikett + full forminsk (07.09 kveld)', () => {
  it('kompakt sheet har mindre topp-luft og bare Ronny-tekst uten bot-animasjon', () => {
    const fab = utenKommentarer(les('../app/(app)/_workshop/workshop-bloub.tsx'));
    const sheet = fab.slice(fab.indexOf('data-ronny-sheet'), fab.indexOf('data-ronny-desktop'));
    expect(sheet).toMatch(/data-ronny-handtak/);
    expect(sheet).toMatch(/pt-0\.5|pt-1|pt-px/);
    expect(sheet).not.toMatch(/flex justify-center pt-2/);
    expect(sheet).toMatch(/>Ronny</);
    expect(sheet).toMatch(/hoyde === 80|!utvidet/);
  });

  it('full sheet: forminsk-ikon, Ronny tar venstreplass når logg er på topp', () => {
    const fab = utenKommentarer(les('../app/(app)/_workshop/workshop-bloub.tsx'));
    const ikon = utenKommentarer(les('../app/(app)/_workshop/ronny-ikoner.tsx'));
    const state = utenKommentarer(les('../app/(app)/_workshop/ronny-sheet-state.tsx'));
    expect(state).toMatch(/forminsk/);
    expect(ikon).toMatch(/RonnyForminskIkon/);
    expect(fab).toMatch(/data-ronny-forminsk|RonnyForminskIkon/);
    expect(fab).toMatch(/data-ronny-topp|scrollTop|paaTopp/);
    expect(fab).toMatch(/aria-label="Forminsk"|aria-label="Forminsk chat"/);
  });
});
