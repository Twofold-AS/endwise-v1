import type { ShellKey } from './nav';
import { erDealerPhoneHjem, erMekanikerPhoneHjem } from './phone-home';

/**
 * Kastbar HIG-forhåndsvisning (F5-56).
 * Kun innlogget forhandler-/mekaniker-hjem — ikke /endwise, ikke andre ruter.
 */
export function erHjemHigFlate(pathname: string, search: string, shell: ShellKey): boolean {
  if (shell === 'mekaniker') return erMekanikerPhoneHjem(pathname);
  if (shell === 'forhandler') return erDealerPhoneHjem(pathname, search);
  return false;
}

export const HJEM_HIG_ATTR = 'data-hjem-hig';
