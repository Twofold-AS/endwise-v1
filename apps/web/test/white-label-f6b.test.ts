import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { destinasjonerForShell, FORHANDLER_NAV, merkNavOmrade } from '../app/(app)/_shell/nav.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('F24 / white label F6b: meny deaktivert ikke skjult', () => {
  it('uten grants er Innboks Timeplan Kunder deaktivert, Hjem og Tjenester ikke', () => {
    const merket = merkNavOmrade(FORHANDLER_NAV, {
      rolle: 'dealer_staff',
      gitt: [{ omrade: 'bookinger', niva: 'endre' }],
    });
    expect(merket.find((i) => i.key === 'home')?.disabled).toBeFalsy();
    expect(merket.find((i) => i.key === 'tjenester')?.disabled).toBeFalsy();
    expect(merket.find((i) => i.key === 'innboks')?.disabled).toBe(true);
    expect(merket.find((i) => i.key === 'innboks')?.disabledHint).toBe('Spør daglig leder');
    expect(merket.find((i) => i.key === 'saker')?.disabled).toBe(true);
    expect(merket.find((i) => i.key === 'kunder')?.disabled).toBe(true);
    const jobber = merket.find((i) => i.key === 'saker')?.pills;
    expect(jobber?.find((p) => p.label === 'Opprett jobb')?.disabled).toBeFalsy();
  });

  it('null grants (flagg av) endrer ikke menyen', () => {
    const merket = destinasjonerForShell({
      shell: 'forhandler',
      role: 'dealer_staff',
      tillatelser: null,
    });
    expect(merket.every((i) => !i.disabled)).toBe(true);
    expect(merket.map((i) => i.label)).toEqual(FORHANDLER_NAV.map((i) => i.label));
  });

  it('sidebar og telefon deaktiverer uten å skjule', () => {
    const sidebar = les('../app/(app)/_shell/sidebar.tsx');
    const telefon = les('../app/(app)/_shell/phone-shell.tsx');
    expect(sidebar).toMatch(/useMineTillatelser/);
    expect(sidebar).toMatch(/aria-disabled/);
    expect(sidebar).not.toMatch(/filter\(\(i\) => !i\.disabled\)/);
    expect(telefon).toMatch(/useMineTillatelser/);
    expect(telefon).toMatch(/aria-disabled/);
  });
});
