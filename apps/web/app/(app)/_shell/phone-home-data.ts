import { nokkeltallFor } from '../analyse/_data';
import { fmtTime } from '../bookinger/_status';
import { sammeKalenderdag } from '../dashboard/_pa-jobb';
import { ukeStartMandag } from './phone-home';

export type PhoneBooking = {
  id: string;
  status: string;
  startsAt: Date | string;
  endsAt?: Date | string;
  regNumber?: string | null;
  serviceName?: string | null;
  serviceNames?: readonly (string | null)[] | null;
  customerName?: string | null;
  mechanicId?: string | null;
};

export type PhoneTraad = {
  subject: string | null;
  unread: number;
  lastMessageAt: Date | string | null;
};

export type PhoneKunde = {
  name: string;
  createdAt: Date | string;
};

export type PhoneDel = {
  name: string;
  sku: string;
  tilgjengelig: number;
};

export type PhoneBevegelse = {
  kind: string;
  partName: string;
  quantity: number;
};

export type PhoneArtikkel = {
  title: string;
  ulest: boolean;
};

export type TimeplanRad = { time: string; what: string };

export function verkstedHeroTall(jobber: PhoneBooking[], naa: Date) {
  const dagens = jobber.filter((j) => sammeKalenderdag(j.startsAt, naa));
  return {
    idag: dagens.length,
    paagaar: dagens.filter((j) => j.status === 'in_progress').length,
    fullfort: dagens.filter((j) => j.status === 'completed').length,
  };
}

export function timeplanRader(jobber: PhoneBooking[], naa: Date, limit = 4): TimeplanRad[] {
  return jobber
    .filter((j) => sammeKalenderdag(j.startsAt, naa) && j.status !== 'cancelled')
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, limit)
    .map((j) => ({
      time: fmtTime(j.startsAt),
      what: jobbHva(j),
    }));
}

export function jobbHva(j: PhoneBooking): string {
  const names = (j.serviceNames ?? []).filter((n): n is string => Boolean(n?.trim()));
  const tjeneste = names.length > 0 ? names.join(' + ') : j.serviceName?.trim();
  if (tjeneste && j.regNumber) return `${tjeneste} · ${j.regNumber}`;
  if (tjeneste) return tjeneste;
  return j.regNumber ?? j.customerName ?? 'Jobb';
}

export function nesteJobb(jobber: PhoneBooking[], naa: Date): TimeplanRad | null {
  const kommende = jobber
    .filter(
      (j) =>
        sammeKalenderdag(j.startsAt, naa) &&
        j.status !== 'cancelled' &&
        j.status !== 'completed' &&
        j.status !== 'no_show',
    )
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const neste =
    kommende.find((j) => new Date(j.startsAt).getTime() >= naa.getTime()) ?? kommende[0] ?? null;
  if (!neste) return null;
  return { time: fmtTime(neste.startsAt), what: jobbHva(neste) };
}

export function ukeStatistikk(jobber: PhoneBooking[], naa: Date) {
  const start = ukeStartMandag(naa);
  const uke = jobber.filter((j) => {
    const t = new Date(j.startsAt).getTime();
    return t >= start.getTime() && t <= naa.getTime() + 86_400_000;
  });
  return {
    jobber: uke.length,
    fullfort: uke.filter((j) => j.status === 'completed').length,
  };
}

export function statistikkSetning(jobber: PhoneBooking[], naa: Date): string {
  const { jobber: antall, fullfort } = ukeStatistikk(jobber, naa);
  if (antall === 0) return 'Ingen jobber denne uken';
  return `${antall} jobber · ${fullfort} fullført denne uken`;
}

function kroner(ore: number): string {
  return `${(ore / 100).toLocaleString('nb-NO')} kr`;
}

export type PhoneTjeneste = {
  name: string;
  active: boolean;
  priceMinor?: number | null;
};

export function timeplanMeta(jobber: PhoneBooking[], naa: Date): string {
  const dagens = jobber.filter(
    (j) => sammeKalenderdag(j.startsAt, naa) && j.status !== 'cancelled',
  );
  if (dagens.length === 0) return 'Ingen jobber i dag';
  const neste = nesteJobb(dagens, naa);
  if (neste) return `${dagens.length} i dag · ${neste.time} ${neste.what}`;
  return `${dagens.length} jobb${dagens.length === 1 ? '' : 'er'} i dag`;
}

export function tjenesterMeta(tjenester: PhoneTjeneste[]): string {
  const aktive = tjenester.filter((t) => t.active);
  if (aktive.length === 0) return 'Ingen tjenester ennå';
  const forste = aktive[0];
  if (!forste) return 'Ingen tjenester ennå';
  const pris =
    forste.priceMinor != null && forste.priceMinor > 0 ? ` · ${kroner(forste.priceMinor)}` : '';
  if (aktive.length === 1) return `${forste.name}${pris}`;
  return `${forste.name}${pris} · ${aktive.length} bookbare`;
}

export function rapporterSetning(): string {
  const tall = nokkeltallFor('7d')[0];
  if (!tall) return 'Siste uke';
  return `${tall.verdi} ${tall.label.toLowerCase()} · 7 dager`;
}

export function innboksMeta(traader: PhoneTraad[]): { ulest: number; linje: string } {
  const ulest = traader.reduce((sum, t) => sum + (t.unread ?? 0), 0);
  const siste = [...traader].sort((a, b) => {
    const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bt - at;
  })[0];
  return {
    ulest,
    linje: siste?.subject?.trim() || (ulest > 0 ? `${ulest} uleste` : 'Ingen nye meldinger'),
  };
}

export function kunderMeta(kunder: PhoneKunde[]): string {
  if (kunder.length === 0) return 'Ingen kunder ennå';
  const siste = [...kunder].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];
  return `${siste?.name ?? 'Kunde'} · ${kunder.length} totalt`;
}

export function organisasjonMeta(
  mekanikere: { status: string; id?: string; name?: string }[],
): string {
  const n = mekanikere.filter((m) => m.status !== 'fri').length;
  if (n === 0) return 'Ingen på jobb';
  return `${n} på jobb`;
}

export function hjelpMeta(artikler: PhoneArtikkel[]): string {
  const ulest = artikler.find((a) => a.ulest);
  return ulest?.title ?? 'Spør oss';
}

export function lagerMeta(lave: PhoneDel[], bevegelser: PhoneBevegelse[]): string {
  const lav = lave[0];
  if (lav) return `${lav.name} · ${lav.tilgjengelig} på lager`;
  const sist = bevegelser[0];
  if (sist) {
    const retning = sist.kind === 'in' ? 'inn' : sist.kind === 'out' ? 'ut' : sist.kind;
    return `${sist.partName} · ${retning} ${sist.quantity}`;
  }
  return 'Lageret er i orden';
}

export function minDagMeta(jobber: PhoneBooking[], naa: Date): string {
  const dagens = jobber.filter((j) => sammeKalenderdag(j.startsAt, naa));
  const neste = nesteJobb(dagens, naa);
  const antall = `${dagens.length} jobb${dagens.length === 1 ? '' : 'er'} i dag`;
  if (!neste) return antall;
  return `${antall} · neste ${neste.time}`;
}
