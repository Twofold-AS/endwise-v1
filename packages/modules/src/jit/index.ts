/**
 * F22 / white label F5b — just-in-time skrive-tilgang.
 * Support er read-only uten aktiv grant. To endwise_admin må godkjenne.
 * Søker kan ikke godkjenne seg selv. Impersonering = inspect-skriv på
 * platform, aldri sesjon på forhandlervert.
 */

export const JIT_VARIGHET_MIN = 15;
export const JIT_VARIGHET_MAX = 240;
export const JIT_VARIGHET_DEFAULT = 60;
export const JIT_BEGRUNNELSE_MIN = 20;
export const JIT_BEGRUNNELSE_MAX = 500;
export const JIT_GODKJENNINGER = 2;

export const JIT_OMFANG = ['skriv'] as const;
export const JIT_STATUS = ['venter', 'godkjent', 'avvist', 'utlopt', 'trukket'] as const;

export type JitOmfang = (typeof JIT_OMFANG)[number];
export type JitStatus = (typeof JIT_STATUS)[number];

/** Samme melding for alle tilgangsfeil. Ingen enumerering. */
export const JIT_FEIL = 'Ikke tillatt';

export type JitRad = {
  id: string;
  tenantId: string;
  soktAv: string;
  begrunnelse: string;
  omfang: JitOmfang;
  varighetMinutter: number;
  status: JitStatus;
  godkjenner1: string | null;
  godkjenner2: string | null;
  godkjentAt: Date | null;
  utloperAt: Date | null;
};

export function endwiseAktor(userId: string): string {
  return `endwise:${userId}`;
}

export function erEndwiseAktor(aktor: string | null | undefined): boolean {
  return typeof aktor === 'string' && aktor.startsWith('endwise:');
}

export function erEndwiseAktivitet(input: {
  action: string;
  actor: string;
  metadata?: Record<string, unknown> | null;
}): boolean {
  if (input.action.startsWith('jit.') || input.action.startsWith('inspect.')) return true;
  if (erEndwiseAktor(input.actor)) return true;
  return input.metadata?.kilde === 'endwise';
}

export function vurderBegrunnelse(
  tekst: string,
): { ok: true; tekst: string } | { ok: false; grunn: string } {
  const t = tekst.replace(/\s+/g, ' ').trim();
  if (t.length < JIT_BEGRUNNELSE_MIN) {
    return { ok: false, grunn: 'Skriv hvorfor, minst 20 tegn.' };
  }
  if (t.length > JIT_BEGRUNNELSE_MAX) {
    return { ok: false, grunn: 'Begrunnelsen er for lang.' };
  }
  return { ok: true, tekst: t };
}

export function vurderVarighet(
  minutter: number | null | undefined,
): { ok: true; minutter: number } | { ok: false; grunn: string } {
  const n = minutter ?? JIT_VARIGHET_DEFAULT;
  if (!Number.isInteger(n) || n < JIT_VARIGHET_MIN || n > JIT_VARIGHET_MAX) {
    return { ok: false, grunn: 'Velg mellom 15 og 240 minutter.' };
  }
  return { ok: true, minutter: n };
}

export function erUtlopt(rad: JitRad, now: Date): boolean {
  if (rad.status !== 'godkjent') return false;
  if (!rad.utloperAt) return true;
  return rad.utloperAt.getTime() <= now.getTime();
}

export function erAktiv(rad: JitRad, now: Date): boolean {
  if (rad.status !== 'godkjent') return false;
  if (!rad.godkjenner1 || !rad.godkjenner2) return false;
  if (!rad.utloperAt) return false;
  return rad.utloperAt.getTime() > now.getTime();
}

export function erApen(rad: JitRad, now: Date): boolean {
  if (rad.status === 'venter') return true;
  return erAktiv(rad, now);
}

export function markerUtlopt(rad: JitRad, now: Date): JitRad | null {
  if (!erUtlopt(rad, now)) return null;
  return { ...rad, status: 'utlopt' };
}

export function kanGodkjenne(input: { rad: JitRad; godkjennerId: string; rolle: string }): boolean {
  if (input.rolle !== 'endwise_admin') return false;
  if (input.rad.status !== 'venter') return false;
  if (input.godkjennerId === input.rad.soktAv) return false;
  if (input.rad.godkjenner1 === input.godkjennerId) return false;
  if (input.rad.godkjenner2 === input.godkjennerId) return false;
  return true;
}

export function nesteEtterGodkjenning(input: {
  rad: JitRad;
  godkjennerId: string;
  rolle: string;
  now: Date;
}): { ok: true; neste: JitRad; aktivert: boolean } | { ok: false } {
  if (!kanGodkjenne(input)) return { ok: false };
  if (!input.rad.godkjenner1) {
    return {
      ok: true,
      aktivert: false,
      neste: { ...input.rad, godkjenner1: input.godkjennerId },
    };
  }
  const utloperAt = new Date(input.now.getTime() + input.rad.varighetMinutter * 60_000);
  return {
    ok: true,
    aktivert: true,
    neste: {
      ...input.rad,
      godkjenner2: input.godkjennerId,
      status: 'godkjent',
      godkjentAt: input.now,
      utloperAt,
    },
  };
}

export function nesteEtterAvvisning(input: {
  rad: JitRad;
  aktorId: string;
  rolle: string;
}): { ok: true; neste: JitRad } | { ok: false } {
  if (input.rolle !== 'endwise_admin') return { ok: false };
  if (input.rad.status !== 'venter') return { ok: false };
  if (input.aktorId === input.rad.soktAv) return { ok: false };
  return { ok: true, neste: { ...input.rad, status: 'avvist' } };
}

export function nesteEtterTrekk(input: {
  rad: JitRad;
  aktorId: string;
  rolle: string;
  now: Date;
}): { ok: true; neste: JitRad } | { ok: false } {
  const admin = input.rolle === 'endwise_admin';
  const eier = input.aktorId === input.rad.soktAv;
  if (!admin && !eier) return { ok: false };
  if (input.rad.status === 'venter') {
    return { ok: true, neste: { ...input.rad, status: 'trukket' } };
  }
  if (erAktiv(input.rad, input.now)) {
    return { ok: true, neste: { ...input.rad, status: 'trukket' } };
  }
  return { ok: false };
}

export function byggJitVarsel(input: {
  forhandler: string;
  minutter: number;
  begrunnelse: string;
  utloper: Date;
}): { subject: string; text: string } {
  const klokke = input.utloper.toLocaleString('nb-NO', {
    timeZone: 'Europe/Oslo',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
  return {
    subject: `Endwise har midlertidig tilgang hos ${input.forhandler}`,
    text: [
      `Endwise har fått midlertidig skrive-tilgang hos ${input.forhandler}.`,
      '',
      `Varighet: ${input.minutter} minutter.`,
      `Utløper: ${klokke}.`,
      '',
      'Begrunnelse:',
      input.begrunnelse,
      '',
      'Du ser alt under Organisasjon → Aktivitet fra Endwise.',
      'Ingen fra Endwise logger inn på verkstedet deres. Tilgangen er på vår egen side og utløper av seg selv.',
    ].join('\n'),
  };
}
