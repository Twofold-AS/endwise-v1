/**
 * Auth-/tRPC-feil til sidetekst. Ingen toast. Ingen rå koder i UI.
 */

export const MANGLER_SESJON_UI =
  'Du er ikke innlogget. Logg inn for å fortsette, eller åpne en gyldig invitasjonslenke.';

export function destinasjonVedManglendeSesjon(): string {
  return '/signin';
}

export function raaFeilmelding(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) return error.message;
  if (error && typeof error === 'object') {
    if ('message' in error && typeof error.message === 'string' && error.message.length > 0) {
      return error.message;
    }
    if (
      'data' in error &&
      error.data &&
      typeof error.data === 'object' &&
      'code' in error.data &&
      typeof error.data.code === 'string'
    ) {
      return error.data.code;
    }
    if ('code' in error && typeof error.code === 'string' && error.code.length > 0) {
      return error.code;
    }
  }
  return String(error);
}

export function erUautorisert(error: unknown): boolean {
  const raw = raaFeilmelding(error);
  return (
    raw === 'UNAUTHORIZED' ||
    raw.includes('UNAUTHORIZED') ||
    /credential account not found/i.test(raw)
  );
}

export function norskAuthFeil(error: unknown): string {
  if (erUautorisert(error)) return MANGLER_SESJON_UI;
  const raw = raaFeilmelding(error);
  return raw.length > 0 ? raw : MANGLER_SESJON_UI;
}
