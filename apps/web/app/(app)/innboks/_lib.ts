/**
 * Delt visningslag for meldings-UI (F6-01). Speiler `thread_kind` i
 * `packages/db/src/schema/messages.ts` — tre kanaler, én trådmodell.
 */
export type ThreadKind = 'customer_dealer' | 'mechanic_dealer' | 'dealer_admin';

export const KIND_LABEL: Record<string, string> = {
  customer_dealer: 'Kunde',
  mechanic_dealer: 'Mekaniker',
  dealer_admin: 'Endwise support',
};

/**
 * Tekst/bakgrunn per kanal. Bruker de temauavhengige `*-soft`-tokenene, ikke
 * alfa-varianter av aksenten: en 12 %-grønn mot hvitt blir nesten usynlig,
 * mens `--ew-accent-soft` (#CAFACE) er eierens faktiske badge-fyll.
 */
export const KIND_TONE: Record<string, string> = {
  customer_dealer: 'bg-accent-soft text-accent-strong',
  mechanic_dealer: 'bg-warn-soft text-warn',
  dealer_admin: 'bg-surface-2 text-fg-muted',
};

/**
 * En agent er bare en deltaker til (F6-05) — den kjennes igjen på prefikset,
 * ikke på en egen tabell. `agent:kunde-support` → «Assistent (AI)».
 */
export const AGENT_PREFIX = 'agent:';

export function isAgent(authorId: string): boolean {
  return authorId.startsWith(AGENT_PREFIX);
}

export function agentName(authorId: string): string {
  return authorId.slice(AGENT_PREFIX.length);
}

/** Svarformen fra `directory.participants`. */
export type Navnekart = Record<string, { navn: string; rolle: 'ansatt' | 'mekaniker' | 'kunde' }>;

export const ROLLE_LABEL: Record<string, string> = {
  ansatt: 'Ansatt',
  mekaniker: 'Mekaniker',
  kunde: 'Kunde',
};

/**
 * Hvem skrev dette?
 *
 * Navnene kommer fra `directory.participants` (08.08.2026) — ruta som krysser
 * deltaker-IDene mot hvem som faktisk hører til denne tenanten. Fram til da
 * viste innboksen «Deltaker a3f9c1», altså en UUID med hatt på.
 *
 * ⚠️ Fallbacket er beholdt med vilje. En ID uten treff er ikke en feil: det kan
 * være en tidligere ansatt, eller en kunde som aldri logget inn på «Min side».
 * Da er en stabil, kort referanse riktigere enn et gjettet navn — og langt
 * riktigere enn å skjule at det står noen der.
 */
export function authorLabel(
  authorId: string,
  meId: string | null | undefined,
  navn?: Navnekart,
): string {
  if (meId && authorId === meId) return 'Deg';
  if (isAgent(authorId)) return 'Assistent (AI)';
  return navn?.[authorId]?.navn ?? `Deltaker ${authorId.slice(0, 6)}`;
}

/**
 * Hvem er samtalen MED? Brukes som tittel i innbokslista.
 *
 * Emnet vinner når det finnes — det er det mennesket skrev. Uten emne er
 * motpartens navn langt mer nyttig enn «Samtale · Kunde». Over to motparter
 * kortes det ned; en tråd med fem deltakere trenger ikke fem navn i en 320px
 * sidebar.
 */
export function threadHeading(
  subject: string | null,
  kind: string,
  motparter: string[],
  navn: Navnekart | undefined,
  meId: string | null | undefined,
): string {
  if (subject?.trim()) return subject.trim();

  const andre = motparter.filter((id) => id !== meId);
  const navngitte = andre
    .map((id) => (isAgent(id) ? 'Assistent (AI)' : navn?.[id]?.navn))
    .filter((n): n is string => Boolean(n));

  if (navngitte.length === 0) return `Samtale · ${KIND_LABEL[kind] ?? kind}`;
  if (navngitte.length <= 2) return navngitte.join(', ');
  return `${navngitte[0]}, ${navngitte[1]} +${navngitte.length - 2}`;
}

export function fmtTime(d: Date | string): string {
  return new Date(d).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
}

/** «I dag 09:41» / «14. mars 09:41» — relativ der det hjelper, absolutt ellers. */
export function fmtWhen(d: Date | string): string {
  const date = new Date(d);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return `I dag ${fmtTime(date)}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `I går ${fmtTime(date)}`;

  return `${date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })} ${fmtTime(date)}`;
}

/** Dagskillet over en meldingsgruppe. */
export function fmtDayHeading(d: Date | string): string {
  const date = new Date(d);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'I dag';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'I går';
  return date.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Eskaleringsgrunnene fra `packages/agent-runtime/src/escalation.ts`. */
export const ESCALATION_REASON_LABEL: Record<string, string> = {
  low_confidence: 'Assistenten var usikker',
  out_of_scope: 'Utenfor assistentens område',
  user_requested: 'Kunden ba om et menneske',
  guardrail: 'Stoppet av sikkerhetsregel',
  error: 'Assistenten møtte en feil',
};

/**
 * ⛔ Hvilken navnevisning en trådtype tåler.
 *
 * ⚠️ **Speiler `visningForTraadtype()` i `packages/modules/src/profil/`.**
 * `apps/web` har ikke `@endwise/modules` som avhengighet (det er server-laget),
 * og å dra inn hele modulpakken i nettleserbundelen for én linje ville vært
 * dyrere enn duplikatet.
 *
 * At det står to steder er greit HER, og bare her, fordi klienten ikke er
 * sikkerheten: den velger bare hvilket oppslag den ber om. Serveren løser
 * navnet, og `directory.participants` defaulter til `offisiell`. Ber klienten
 * feil, blir det feil VISNING — ikke en åpen dør. Den ekte grensen står i
 * `visningsnavn()` på serveren.
 */
export function visningForTraadtype(kind: string): 'intern' | 'offisiell' {
  return kind === 'mechanic_dealer' || kind === 'dealer_admin' ? 'intern' : 'offisiell';
}
