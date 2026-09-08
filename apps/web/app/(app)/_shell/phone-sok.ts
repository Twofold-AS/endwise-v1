import { filtrerTommeGrupper, grupperSider, type SokGruppe } from '@endwise/modules/sok';

export const PHONE_SOK_MAX = 8;
export const PHONE_SOK_LAGER = 'ew-phone-sok';

export function slaaSammenSok(
  server: SokGruppe[],
  dest: ReadonlyArray<{ key: string; label: string; href: string }>,
  q: string,
): SokGruppe[] {
  const sider = grupperSider(dest, q);
  return filtrerTommeGrupper(sider ? [...server, sider] : server);
}

export function lesNyligeSok(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
  } catch {
    return [];
  }
}

export function huskSok(nylige: string[], q: string): string[] {
  const t = q.trim();
  if (!t) return nylige;
  const uten = nylige.filter((x) => x.toLowerCase() !== t.toLowerCase());
  return [t, ...uten].slice(0, PHONE_SOK_MAX);
}
