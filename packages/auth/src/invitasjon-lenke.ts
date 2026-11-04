import { appOffentligUrl, platformOffentligUrl } from './sone.ts';

export function invitasjonOffentligLenke(input: {
  token: string;
  kind: 'staff' | 'owner' | 'platform';
  env?: Record<string, string | undefined>;
}): string {
  const base =
    input.kind === 'platform' ? platformOffentligUrl(input.env) : appOffentligUrl(input.env);
  return `${base.replace(/\/$/, '')}/invitasjon/${input.token}`;
}

export function invitasjonGodtaVert(input: {
  kind: 'staff' | 'owner' | 'platform';
  env?: Record<string, string | undefined>;
}): string {
  return input.kind === 'platform' ? platformOffentligUrl(input.env) : appOffentligUrl(input.env);
}
