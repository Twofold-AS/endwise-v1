/**
 * F5-19 / F7-06 — visningsnavn, og den ene grensen som må holde.
 * Regelen
 * Et kallenavn er intern sjargong. Det skal aldri vises for en kunde.
 * Grunnen til at dette er en funksjon og ikke en kommentar: regelen er lett å
 * huske når man skriver den, og lett å glemme et halvår senere når noen legger
 * til en kundevendt flate og gjenbruker et navneoppslag «som allerede finnes».
 * Da må sikringen ligge i koden, ikke i hukommelsen.
 * Hvorfor `offisiell` er default
 * Fordi en glemt parameter skal gi ekte navn, aldri et kallenavn. Feilen skal
 * gå mot det trygge. Motsatt default ville betydd at hver ny flate lekker med
 * mindre noen husker å be om noe.
 */

/**
 * Hvilken sammenheng navnet vises i.
 * `intern` — kun kollegaer ser det: mekanikervisning, intern chat
 * (`mechanic_dealer`), teamlister i panelet.
 * `offisiell` — alt annet. Kundetråder, widget, «Min side», e-post, SMS,
 * kvitteringer, rapporter som kan deles.
 */
export type Navnevisning = 'intern' | 'offisiell';

export type Navneprofil = {
  /** Ekte navn fra Better-Auth (`user.name`) eller mekanikerprofilen. */
  navn: string;
  /** Kallenavn fra `member_profiles.nickname`. Null = ikke satt. */
  kallenavn?: string | null;
};

/**
 * Navnet som skal vises. Eneste sted et kallenavn blir til et visningsnavn.
 * @param visning Utelates den, er svaret `offisiell` — altså det ekte navnet.
 */
export function visningsnavn(profil: Navneprofil, visning: Navnevisning = 'offisiell'): string {
  if (visning !== 'intern') return profil.navn;
  const kallenavn = profil.kallenavn?.trim();
  return kallenavn ? kallenavn : profil.navn;
}

/**
 * Kan denne rollen ha kallenavn?
 * (Mikael): ja for alle innloggede roller — forhandler-admin,
 * staff, mekaniker, Endwise. Kallenavnet er intern sjargong og vises aldri
 * utad (`visningsnavn` defaulter til `offisiell`). Feltet var tidligere
 * stengt for `dealer_admin`/`endwise_admin`; det er åpnet, ikke et nytt
 * navnesystem.
 * Håndheves i mutasjonen (`profile.setNickname`) via denne funksjonen.
 */
export function kanHaKallenavn(rolle: string | null | undefined): boolean {
  return Boolean(rolle);
}

/** Trådtyper der intern visning er lov. Kundetråder er det ikke. */
export function visningForTraadtype(kind: string): Navnevisning {
  return kind === 'mechanic_dealer' || kind === 'dealer_admin' ? 'intern' : 'offisiell';
}

/*
 * Jobbfunksjon: den andre dimensjonen
 * En funksjon er aldri en rettighet. Tilgang bestemmes av `member.role`
 * (`dealer_admin` / `dealer_staff`) og håndheves av `adminProcedure`, RLS og
 * entitlement-gatene. Funksjonen bestemmer bare hvor du lander og hvordan navet
 * vektlegges.
 * `selger` og `support` har med vilje **nøyaktig samme tilgang**. Ser du en
 * sjekk noe sted som gir `selger` lov til noe `support` ikke får — eller
 * omvendt — er det en feil som skal rettes, ikke et mønster å kopiere. Den
 * eneste funksjonen som følger med et tilgangsnivå er `leder`, og den er
 * Utledet av rollen, ikke omvendt.
 */
export type Jobbfunksjon = 'leder' | 'selger' | 'support' | 'mekaniker';

export const JOBBFUNKSJONER: Jobbfunksjon[] = ['leder', 'selger', 'support', 'mekaniker'];

/** Rollene som er ledelse. Uavhengig av kallenavn — alle roller kan ha det. */
const LEDERROLLER = new Set(['dealer_admin', 'endwise_admin', 'owner']);

/**
 * Hvilken funksjon har denne personen?
 * Rekkefølgen er ikke tilfeldig:
 * 1. **Er du leder, er du leder.** Rollen vinner over en lagret verdi — en
 * `dealer_admin` med `support` i basen (fra før hun ble forfremmet, eller
 * fra en feilkonfigurasjon) skal ikke lande i innboksen uten sidebar.
 * 2. Ellers gjelder det som faktisk er satt.
 * 3. Ellers utledes det: mekanikerprofil → `mekaniker`, ellers `selger`.
 * Punkt 3 er grunnen til at kolonnen er nullable: de aller fleste ansatte har
 * ingen rad i `member_profiles`, og skal ikke trenge en.
 */
export function resolveJobbfunksjon(input: {
  rolle: string | null | undefined;
  /** `member_profiles.job_function`. Null = ikke satt eksplisitt. */
  lagret?: Jobbfunksjon | null;
  /** Har brukeren en rad i `mechanics` for denne tenanten? */
  harMekanikerprofil?: boolean;
}): Jobbfunksjon {
  if (input.rolle && LEDERROLLER.has(input.rolle)) return 'leder';
  if (input.lagret && input.lagret !== 'leder') return input.lagret;
  return input.harMekanikerprofil ? 'mekaniker' : 'selger';
}

/**
 * Hvor lander man etter innlogging?
 * Dette er en landing, ikke en lås. Etter at du er inne kan du navigere hvor
 * du vil innenfor tilgangen din — en support-medarbeider som vil se kalenderen
 * skal få lov. Den eneste ekte låsen er «ren mekaniker», som håndheves i
 * `(app)/layout.tsx` fordi mekanikerflaten er hele appen for dem.
 */
export function landingForJobbfunksjon(funksjon: Jobbfunksjon): string {
  switch (funksjon) {
    case 'mekaniker':
      return '/min-dag';
    case 'support':
      return '/innboks';
    default:
      // leder og selger starter begge i verkstedets oversikt.
      return '/dashboard';
  }
}

/**
 * Hvem kan endre andres jobbfunksjon? Kun ledelse.
 * Håndheves server-side i `team.setFunction`. En `dealer_staff` skal ikke kunne
 * gi seg selv en annen funksjon — ikke fordi funksjonen gir rettigheter (den
 * gjør ikke det), men fordi hvem som gjør hva på et verksted er lederens
 * beslutning, ikke den ansattes.
 */
export function kanEndreJobbfunksjon(rolle: string | null | undefined): boolean {
  if (!rolle) return false;
  return LEDERROLLER.has(rolle);
}

/**
 * Funksjoner en leder kan tildele.
 * `leder` mangler med vilje: den følger av tilgangsnivået (`dealer_admin`), og
 * å kunne velge den fra en nedtrekksliste ville betydd at man kunne gi noen
 * lederens landingsvisning uten lederens rettigheter — to ting som later som de
 * hører sammen, men ikke gjør det.
 */
export const TILDELBARE_FUNKSJONER: Jobbfunksjon[] = ['selger', 'support', 'mekaniker'];

export function kanTildeles(funksjon: string): funksjon is Jobbfunksjon {
  return (TILDELBARE_FUNKSJONER as string[]).includes(funksjon);
}

/*
 * Avatar (blobatar) — hva serveren godtar at en bruker velger.
 */

/**
 * Silhuettene blobatar kan tegne. Speiler `AVATAR_FORMER` i
 * `packages/db/src/schema/profiles.ts`, som igjen speiler bibliotekets eget
 * ti-form-vokabular (`blobatar/src/styles/blob.ts`).
 * Rekkefølgen er likegyldig her — vi lagrer navnet, ikke indeksen. Det er
 * med vilje: blobatar fryser tallbåndene per major, men et band kan flytte seg
 * i neste major, og da ville et lagret tall stille gitt en annen form.
 */
export const AVATAR_FORMER = [
  'round',
  'organic',
  'boxy',
  'capsule',
  'nub',
  'cloud',
  'droplet',
  'hexagon',
  'sun',
  'triangle',
] as const;

export type AvatarForm = (typeof AVATAR_FORMER)[number];

/**
 * Humørene. **Speiler `AVATAR_HUMOR` i `packages/db/src/schema/profiles.ts`**,
 * som igjen speiler blobatars `expression`-eksporter. Kuratert utvalg — se
 * begrunnelsen i skjemaet for hvorfor sad/mad/sick/scared ikke er med.
 */
export const AVATAR_HUMOR = [
  'idle',
  'happy',
  'wink',
  'smug',
  'sleepy',
  'thinking',
  'surprised',
  'unsure',
  'love',
  'shy',
] as const;

export type AvatarHumor = (typeof AVATAR_HUMOR)[number];

/** Antall forfattede fargesvatsjer i blobatar (`TONES` i `color.ts`). */
export const AVATAR_TONER = 6;

/**
 * Én brukers avatarvalg. Null overalt = alt utledes fra seeden.
 * Tre navngitte felt, ikke blobatars rå `TraitOverrides`. En fri trait-map
 * fra klienten ville betydd at klienten bestemmer hvilke egenskaper som kan
 * pinnes — inkludert `motion.*` og `gaze.*`, som ingen har bedt om å styre.
 */
export type AvatarValg = {
  form: AvatarForm | null;
  /** Utledes aldri av seeden. Null = nøytralt ansikt. */
  humor: AvatarHumor | null;
  /** Grader, 0–359. */
  farge: number | null;
  /** Indeks i svatsjsettet, 0–5. */
  tone: number | null;
};

export const TOM_AVATAR: AvatarValg = { form: null, humor: null, farge: null, tone: null };

/** Er strengen en form vi kjenner? Brukes av ruta før skriving. */
export function erAvatarForm(v: unknown): v is AvatarForm {
  return typeof v === 'string' && (AVATAR_FORMER as readonly string[]).includes(v);
}

export function erAvatarHumor(v: unknown): v is AvatarHumor {
  return typeof v === 'string' && (AVATAR_HUMOR as readonly string[]).includes(v);
}

/**
 * Normaliser en rad fra `user_preferences` til `AvatarValg`.
 * Ukjente verdier faller til null i stedet for å bli sendt videre. Raden kan
 * være skrevet av en eldre versjon, eller for hånd i basen; en form vi ikke
 * kjenner skal gi ansiktet fra seeden, ikke en tom SVG.
 */
export function lesAvatar(
  rad:
    | {
        avatarShape?: string | null;
        avatarHumor?: string | null;
        avatarHue?: number | null;
        avatarTone?: number | null;
      }
    | null
    | undefined,
): AvatarValg {
  if (!rad) return TOM_AVATAR;
  const farge = rad.avatarHue;
  const tone = rad.avatarTone;
  return {
    form: erAvatarForm(rad.avatarShape) ? rad.avatarShape : null,
    humor: erAvatarHumor(rad.avatarHumor) ? rad.avatarHumor : null,
    farge: typeof farge === 'number' && farge >= 0 && farge <= 359 ? farge : null,
    tone: typeof tone === 'number' && tone >= 0 && tone < AVATAR_TONER ? tone : null,
  };
}

export { updateMechanicCapacity } from './capacity.ts';
export { synkMekanikerRad } from './mekaniker-rad.ts';

export type { MekanikerStatus, StatusHumor } from './status-humor.ts';
export {
  MEKANIKER_STATUS_HUMOR,
  MEKANIKER_STATUS_LABEL,
  mekanikerStatusVisning,
  STATUS_TELLENDE_BOOKING,
  tellerSomBelastning,
  utledMekanikerStatus,
  visningsHumor,
} from './status-humor.ts';
