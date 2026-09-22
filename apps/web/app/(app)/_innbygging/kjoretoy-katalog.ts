/**
 * Claude merke/modell/år-katalog. Type → merke → modell → [fra, til].
 */

export type KjoretoyKat = 'MC' | 'Båt' | 'ATV';

export const KJORETOY_TYPE_TIL_KAT: Record<'mc' | 'boat' | 'atv', KjoretoyKat> = {
  mc: 'MC',
  boat: 'Båt',
  atv: 'ATV',
};

export const KJORETOY_KAT_TIL_TYPE: Record<KjoretoyKat, 'mc' | 'boat' | 'atv'> = {
  MC: 'mc',
  Båt: 'boat',
  ATV: 'atv',
};

type ArsSpenn = readonly [number, number];
type ModellKart = Record<string, ArsSpenn>;
type MerkeKart = Record<string, ModellKart>;

export const KJORETOY_KATALOG: Record<KjoretoyKat, MerkeKart> = {
  MC: {
    Yamaha: { 'MT-07': [2014, 2026], 'MT-09': [2014, 2026], 'Tenere 700': [2019, 2026] },
    Honda: { CB500X: [2013, 2026], 'Africa Twin': [2016, 2026], CB650R: [2019, 2026] },
    BMW: { 'R 1300 GS': [2024, 2026], 'F 900 XR': [2020, 2026] },
    KTM: { '390 Duke': [2013, 2026], '890 Adventure': [2021, 2026] },
    Suzuki: { 'V-Strom 650': [2012, 2026], SV650: [2016, 2026] },
    Kawasaki: { Z650: [2017, 2026], 'Ninja 650': [2017, 2026] },
  },
  Båt: {
    Yamarin: { '68 DC': [2018, 2026], 'Cross 60 BR': [2015, 2026] },
    Askeladden: { C65: [2015, 2026], P66: [2017, 2026] },
    Buster: { Magnum: [2012, 2026], XL: [2012, 2026] },
    Finnmaster: { 'Husky R6': [2018, 2026], T7: [2018, 2026] },
  },
  ATV: {
    Polaris: { 'Sportsman 570': [2014, 2026], 'Ranger 1000': [2018, 2026] },
    'Can-Am': { 'Outlander 650': [2012, 2026], 'Outlander 1000': [2012, 2026] },
    Yamaha: { 'Grizzly 700': [2007, 2026], 'Kodiak 700': [2016, 2026] },
    Honda: { 'TRX 420 Rancher': [2007, 2026], 'Pioneer 700': [2014, 2026] },
  },
};

export function merkerFor(type: KjoretoyKat): string[] {
  return Object.keys(KJORETOY_KATALOG[type]).sort((a, b) => a.localeCompare(b, 'nb'));
}

export function modellerFor(type: KjoretoyKat, merke: string): string[] {
  return Object.keys(KJORETOY_KATALOG[type][merke] ?? {});
}

export function arFor(type: KjoretoyKat, merke: string, modell: string): string[] {
  const spenn = KJORETOY_KATALOG[type][merke]?.[modell];
  if (!spenn) return [];
  const out: string[] = [];
  for (let y = Math.min(spenn[1], 2026); y >= spenn[0]; y -= 1) out.push(String(y));
  return out;
}
