import { networkInterfaces } from 'node:os';

/**
 * F1 — LOKALE ORIGINS FOR DEV: hvilke adresser er «denne maskinen»?
 *
 * ── Problemet dette løser ─────────────────────────────────────────────────
 * Skal telefonen teste appen over wifi, må den åpne `http://192.168.x.x:3000`.
 * Da er origin-en en annen enn `BETTER_AUTH_URL` (`http://localhost:3000`), og
 * Better-Auth svarer `403 Invalid origin` på hvert eneste auth-kall. Symptomet
 * er en innlogging som «bare ikke virker», uten at noe i UI-et antyder at det er
 * adressen i adressefeltet som er problemet. Nøyaktig samme klasse feil som
 * `127.0.0.1`-saken 07.08.2026.
 *
 * ── Hvorfor maskinens egne IP-er, og ikke en env-variabel ────────────────
 * En hardkodet IP i `.env` er riktig helt til ruteren deler ut en ny adresse,
 * og da er man tilbake til en uforklarlig 403. Vi leser i stedet adressene
 * maskinen FAKTISK har akkurat nå. Ingenting å vedlikeholde.
 *
 * ── ⛔ Hvorfor dette ikke er et hull ─────────────────────────────────────
 * Tre begrensninger, alle nødvendige:
 *   1. Kalles KUN når `NODE_ENV !== 'production'` (se `auth.ts`).
 *   2. Kun adresser som tilhører DENNE maskinen — ikke et subnett, ikke et
 *      jokertegn. En angriper på samme wifi kan ikke få sin egen origin betrodd.
 *   3. Kun private RFC1918-områder. En dev-maskin med en offentlig IP skal ikke
 *      begynne å betro sin egen offentlige adresse.
 */

/** 10.0.0.0/8 · 172.16.0.0/12 · 192.168.0.0/16 — RFC1918. */
function erPrivat(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number);
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

/** Maskinens private IPv4-adresser, uten loopback. */
export function lokaleIPv4(): string[] {
  const ut: string[] = [];
  for (const adressser of Object.values(networkInterfaces())) {
    for (const a of adressser ?? []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      if (erPrivat(a.address)) ut.push(a.address);
    }
  }
  return [...new Set(ut)];
}

/**
 * Origins en dev-server skal betro: loopback + maskinens LAN-adresser.
 *
 * @param port Web-porten. Kun :3000 eksponeres — API og stream nås gjennom
 *   Next sine server-side rewrites, ikke av nettleseren direkte.
 */
export function devTrustedOrigins(port = 3000): string[] {
  return [
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
    ...lokaleIPv4().map((ip) => `http://${ip}:${port}`),
  ];
}
