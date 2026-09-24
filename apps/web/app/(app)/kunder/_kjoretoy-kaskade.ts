/** Lokal katalog-hjelp for kaskade type → merke → modell → år. Ikke Vegvesen. */

export const KJORETOY_TYPER = [
  { key: 'mc', label: 'MC' },
  { key: 'boat', label: 'Båt' },
  { key: 'atv', label: 'ATV' },
] as const;

export type KjoretoyTypeKey = (typeof KJORETOY_TYPER)[number]['key'];

const KATALOG: Record<KjoretoyTypeKey, Record<string, string[]>> = {
  mc: {
    Yamaha: ['MT-07', 'MT-09', 'R7', 'Tracer 9'],
    Honda: ['CB650R', 'CBR650R', 'Africa Twin'],
    BMW: ['R 1250 GS', 'F 900 R', 'S 1000 RR'],
    KTM: ['890 Duke', '1290 Super Adventure'],
    Suzuki: ['GSX-8S', 'V-Strom 800'],
  },
  boat: {
    Yamaha: ['F60', 'F115', 'F150'],
    Mercury: ['60 EFI', '115 Pro XS'],
    Honda: ['BF60', 'BF100'],
  },
  atv: {
    Yamaha: ['Grizzly 700', 'Kodiak 700'],
    Honda: ['TRX520', 'Pioneer 700'],
    Polaris: ['Sportsman 570', 'Ranger 1000'],
    'Can-Am': ['Outlander 700', 'Defender HD9'],
  },
};

export function merkerFor(type: KjoretoyTypeKey): string[] {
  return Object.keys(KATALOG[type]);
}

export function modellerFor(type: KjoretoyTypeKey, merke: string): string[] {
  return KATALOG[type][merke] ?? [];
}

export function arsmodeller(naa = new Date()): number[] {
  const y = naa.getUTCFullYear();
  return Array.from({ length: 16 }, (_, i) => y - i);
}
