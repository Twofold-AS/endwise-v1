import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FORHANDLER_NAV } from '../app/(app)/_shell/nav.ts';
import { aktivJobb, ansattePaJobb } from '../app/(app)/dashboard/_pa-jobb.ts';
import {
  timeplanKloss,
  VERKSTED_DAG_SLUTT,
  VERKSTED_DAG_START,
} from '../app/(app)/dashboard/_timeplan-layout.ts';

/**
 * F3-05 — Verkstedet: timeplan + ansatte på jobb.
 * Ikke Kontor, ikke Gulvet, ikke AI-chat i nav.
 */
const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

const naa = new Date('2026-08-25T10:00:00');

describe('ansattePaJobb — hvem som er på gulvet', () => {
  it('holder fri utenfor og sorterer på navn', () => {
    const liste = ansattePaJobb([
      { id: 'b', name: 'Berit', status: 'på_jobb' },
      { id: 'a', name: 'Ada', status: 'ledig' },
      { id: 'c', name: 'Cato', status: 'fri' },
      { id: 'd', name: 'Dag', status: 'opptatt' },
    ]);
    expect(liste.map((m) => m.id)).toEqual(['a', 'b', 'd']);
    expect(liste.some((m) => m.status === 'fri')).toBe(false);
  });

  it('aktivJobb velger pågående, ellers neste levende i dag', () => {
    const jobber = [
      {
        id: 'ferdig',
        mechanicId: 'm1',
        status: 'completed',
        startsAt: '2026-08-25T08:00:00',
        endsAt: '2026-08-25T09:00:00',
      },
      {
        id: 'naa',
        mechanicId: 'm1',
        status: 'in_progress',
        startsAt: '2026-08-25T09:30:00',
        endsAt: '2026-08-25T11:00:00',
      },
      {
        id: 'senere',
        mechanicId: 'm1',
        status: 'confirmed',
        startsAt: '2026-08-25T13:00:00',
        endsAt: '2026-08-25T14:00:00',
      },
      {
        id: 'annen',
        mechanicId: 'm2',
        status: 'confirmed',
        startsAt: '2026-08-25T10:00:00',
        endsAt: '2026-08-25T11:00:00',
      },
    ];
    expect(aktivJobb(jobber, 'm1', naa)?.id).toBe('naa');
    expect(aktivJobb(jobber, 'm2', naa)?.id).toBe('annen');
    expect(aktivJobb(jobber, 'm3', naa)).toBeNull();
  });

  it('timeplan-klossen klippes inn i 07–18', () => {
    expect(VERKSTED_DAG_START).toBe(7);
    expect(VERKSTED_DAG_SLUTT).toBe(18);
    const tidlig = timeplanKloss('2026-08-25T06:00:00', '2026-08-25T08:00:00', 40);
    expect(tidlig.top).toBe(0);
    expect(tidlig.height).toBeGreaterThan(0);
    const sen = timeplanKloss('2026-08-25T17:30:00', '2026-08-25T20:00:00', 40);
    expect(sen.top).toBeGreaterThan(0);
    expect(sen.top).toBeLessThan(11 * 40);
    expect(sen.height).toBeGreaterThanOrEqual(22);
  });
});

describe('Verkstedet-flaten — navn og innhold', () => {
  it('er Forhandler › Verkstedet, ikke Kontor eller Gulvet', () => {
    const side = les('../app/(app)/dashboard/page.tsx');
    expect(side).toMatch(/sr-only">Verkstedet/);
    expect(side).toMatch(/AnsattePaJobb/);
    expect(side).toMatch(/Timeplan/);
    expect(side).not.toMatch(/Kontor|Gulvet/);
    expect(FORHANDLER_NAV.find((i) => i.key === 'dashboard')?.label).toBe('Verkstedet');
    expect(FORHANDLER_NAV.some((i) => /kontor|gulvet/i.test(i.label))).toBe(false);
  });

  it('AI-chat er ikke i hovednavet', () => {
    expect(FORHANDLER_NAV.some((i) => i.key === 'ai-verktoy')).toBe(false);
    expect(FORHANDLER_NAV.some((i) => /ai-chat|AI-chat/i.test(i.label))).toBe(false);
    const nav = les('../app/(app)/_shell/nav.ts');
    expect(nav).toMatch(/AI-verktøy er PARKERT/);
  });

  it('rører ikke Kompetanse/Timeplan under Organisasjon', () => {
    const org = FORHANDLER_NAV.find((i) => i.key === 'team');
    expect(org?.label).toBe('Organisasjon');
    expect(org?.children?.map((c) => c.label)).toEqual(
      expect.arrayContaining(['Kompetanse', 'Timeplan']),
    );
    const kompetanse = les('../app/(app)/mekanikere/kompetanse/page.tsx');
    expect(kompetanse).not.toMatch(/AnsattePaJobb|dashboard\/_timeplan/);
  });
});
