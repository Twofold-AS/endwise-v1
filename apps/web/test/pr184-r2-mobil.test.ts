import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ansattePulse } from '../app/(app)/_shell/phone-home-pulse.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('PR #184 runde 2 — Mikael mobil-review', () => {
  it('På jobb: nevner = aktive mekanikere, teller = clockedIn (0 uten API)', () => {
    expect(
      ansattePulse([
        { id: '1', active: true },
        { id: '2', active: true },
        { id: '3', active: true },
        { id: '4', active: true },
      ]),
    ).toEqual({ paJobb: 0, totalt: 4 });
    expect(
      ansattePulse([
        { id: '1', active: true, clockedIn: true },
        { id: '2', active: false },
        { id: '3', active: true },
      ]),
    ).toEqual({ paJobb: 1, totalt: 2 });
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    expect(hjem).toMatch(/mechanics\.list/);
    expect(hjem).toMatch(/ansattePulse\(mekanikerListe\.data/);
    expect(hjem).not.toMatch(/ansattePulse\([^)]+jobber/);
  });

  it('dato/tid er Board DatePicker/DateCalendar/TimeField, ikke native date', () => {
    const picker = les('../../../packages/ui/src/components/base/date-picker/date-picker.tsx');
    expect(picker).toMatch(/Drawer/);
    expect(picker).toMatch(/Velg dato/);
    expect(picker).toMatch(/Avbryt/);
    expect(utenKommentarer(les('../../../packages/ui/src/theme.css'))).toMatch(
      /--color-date-range-edge-background: #141414/,
    );
    expect(utenKommentarer(les('../app/(app)/mekanikere/kompetanse/_mekaniker.tsx'))).not.toMatch(
      /type="date"/,
    );
    expect(utenKommentarer(les('../app/(app)/mekanikere/kompetanse/_mekaniker.tsx'))).toMatch(
      /FeltDato/,
    );
    expect(utenKommentarer(les('../app/(app)/bookinger/_starttid-velger.tsx'))).toMatch(
      /FeltKlokke/,
    );
  });

  it('Ny/Opprett går i OpprettSkuff (bunn-Drawer)', () => {
    expect(les('../app/(app)/_shell/opprett-skuff.tsx')).toMatch(/placement="bottom"/);
    expect(utenKommentarer(les('../app/(app)/kunder/page.tsx'))).toMatch(/OpprettSkuff/);
    expect(utenKommentarer(les('../app/(app)/innboks/page.tsx'))).toMatch(/OpprettSkuff/);
    expect(utenKommentarer(les('../app/(app)/saker/page.tsx'))).toMatch(/OpprettSkuff/);
    expect(utenKommentarer(les('../app/(app)/prisliste/page.tsx'))).toMatch(/OpprettSkuff/);
    expect(utenKommentarer(les('../app/(app)/organisasjon/_opprett-dialog.tsx'))).toMatch(
      /OpprettSkuff/,
    );
  });

  it('Timeplan er jobber/dag; Timeplan ansatte bor under Org', () => {
    const jobber = utenKommentarer(les('../app/(app)/saker/page.tsx'));
    expect(jobber).toMatch(/TimeplanDagsliste/);
    expect(jobber).not.toMatch(/TimeplanFlate/);
    expect(les('../app/(app)/organisasjon/_timeplan-ansatte.tsx')).toMatch(/data-timeplan-ansatte/);
    expect(les('../app/(app)/organisasjon/_timeplan-ansatte.tsx')).toMatch(/DeaktivertHandling/);
    expect(les('../app/(app)/organisasjon/page.tsx')).toMatch(/TimeplanAnsatteFlate/);
  });

  it('Kunder A–Å har tap/dra og ikke overlapping scrollbar', () => {
    const rail = utenKommentarer(les('../app/(app)/kunder/_alfa-rail.tsx'));
    const liste = utenKommentarer(les('../app/(app)/kunder/_alfa-liste.tsx'));
    expect(rail).toMatch(/onPointerDown/);
    expect(rail).toMatch(/onPointerMove/);
    expect(liste).toMatch(/no-scrollbar/);
    expect(liste).toMatch(/sticky/);
    expect(liste).not.toMatch(/rounded-xl border/);
  });
});
