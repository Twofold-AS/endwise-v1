/** Kunde-OTP på forhandler-vert: ærlig nei når e-post/telefon ikke er kunde her. */

export type BeOmKodeGrunn = 'ukjent-kunde' | 'for-mange' | 'feil';

export type BeOmKodeSvar = { sendt: true } | { sendt: false; grunn: BeOmKodeGrunn };

export type BeOmKodeBeslutning =
  | { handling: 'send'; epost: string }
  | { handling: 'stopp'; grunn: BeOmKodeGrunn };

export const KUNDE_KODE_SENDT = 'Vi har sendt en kode til e-posten din.';
export const KUNDE_KODE_FOR_MANGE = 'For mange forsøk. Vent og prøv igjen.';
export const KUNDE_KODE_FEIL = 'Kunne ikke sende kode. Prøv igjen.';

export function avgjorBeOmKode(input: {
  tillatt: boolean;
  tenantId: string | null | undefined;
  harIdent: boolean;
  kundeEpost: string | null | undefined;
}): BeOmKodeBeslutning {
  if (!input.tillatt) return { handling: 'stopp', grunn: 'for-mange' };
  if (!input.tenantId || !input.harIdent) return { handling: 'stopp', grunn: 'ukjent-kunde' };
  const epost = input.kundeEpost?.trim().toLowerCase() ?? '';
  if (!epost) return { handling: 'stopp', grunn: 'ukjent-kunde' };
  return { handling: 'send', epost };
}

export function beOmKodeSvar(beslutning: BeOmKodeBeslutning): BeOmKodeSvar {
  if (beslutning.handling === 'send') return { sendt: true };
  return { sendt: false, grunn: beslutning.grunn };
}

export function ukjentKundeMelding(
  forhandlernavn: string,
  kanal: 'epost' | 'telefon' = 'epost',
): string {
  const navn = forhandlernavn.trim() || 'denne forhandleren';
  if (kanal === 'telefon') {
    return `Vi finner ingen kunde med dette nummeret hos ${navn}.`;
  }
  return `Vi finner ingen kunde med denne e-posten hos ${navn}.`;
}

export function kundeKodeFeilMelding(
  grunn: BeOmKodeGrunn,
  forhandlernavn: string,
  kanal: 'epost' | 'telefon',
): string {
  if (grunn === 'ukjent-kunde') return ukjentKundeMelding(forhandlernavn, kanal);
  if (grunn === 'for-mange') return KUNDE_KODE_FOR_MANGE;
  return KUNDE_KODE_FEIL;
}
