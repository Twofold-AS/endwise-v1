import type { ModelMessage, Tool } from 'ai';

/**
 * KI-Ronny-lås (Mikael 04.09.2026).
 * Instruksjoner alene holder ikke — modellen vil prøve å lyde jailbreaks.
 * Dette er det deterministiske laget: klassifiser inn, nekt uten modell,
 * slipp bare allowlistede verktøy, og skriv om svar som lekker eller dikter.
 */

export const RONNY_LIVE_VERKTOY = [
  'dagensBookinger',
  'finnDel',
  'lavtLager',
  'lagerLokasjoner',
  'mekanikere',
  'gaaTil',
  'sokKunder',
] as const;

export const RONNY_PARKERTE_VERKTOY = ['opprettBooking', 'sokJobber', 'aapneInnboks'] as const;

export const RONNY_TILLATTE_VERKTOY = [...RONNY_LIVE_VERKTOY, ...RONNY_PARKERTE_VERKTOY] as const;

export type RonnyVerktoyNavn = (typeof RONNY_TILLATTE_VERKTOY)[number];

export const RONNY_NEKT_SVAR =
  'Jeg kan bare hjelpe med Endwise hos denne forhandleren — bookinger, lager, kunder, verksted og innboks. Hva trenger du der?';

export const RONNY_MANGLER_DATA =
  'Jeg har ikke de dataene i Endwise. Jeg kan slå opp bookinger, deler, lager, mekanikere og kunder hvis du spør konkret.';

export type RonnyUtfall = 'tillatt' | 'trenger_verktoy' | 'off_topic' | 'jailbreak';

export interface RonnyKlassifisering {
  utfall: RonnyUtfall;
  verktoy: RonnyVerktoyNavn | null;
}

const JAILBREAK = [
  /ignore (all )?(previous|prior|above) instructions/i,
  /ignorer (alle )?(tidligere|forrige|over) instruksjon/i,
  /you are now\b/i,
  /du er nå en\b/i,
  /system prompt|systeminstruksjon/i,
  /(reveal|vis meg|skriv ut).{0,20}(prompt|instruks)/i,
  /do anything now/i,
  /(you are|you're|du er) DAN\b/i,
  /\bDAN mode\b/i,
  /jailbreak/i,
  /developer mode|utviklermodus/i,
  /(pretend|late som) (you are|du er)/i,
  /roleplay as|rollespill som/i,
  /from now on you|fra nå av skal du/i,
  /(forget|glem) (your|dine) (instructions|instruks)/i,
  /without (any )?restrictions|uten begrensninger/i,
  /nye instruksjoner\s*:/i,
  /new instructions\s*:/i,
];

const ENDWISE = [
  /endwise|ki-?ronny|\bronny\b/i,
  /booking|timeplan|avtale|timebestill/i,
  /lager|reservedel|\bdel(er|en|ene)?\b|sku|hylle|lokasjon/i,
  /kunde(r|n|ne)?|mekaniker|ansatt|kapasitet/i,
  /innboks|verksted|jobb(er|en|ene)?|\bsak(er|en)?\b/i,
  /organisasjon|forhandler|tjeneste|prisliste/i,
  /gaaTil|gå til|gåTil|sokKunder/i,
  /quick|eu-kontroll|motorsykkel|\bmc\b/i,
];

const OFF_TOPIC = [
  /politikk|storting|valgkamp|president|statsminister/i,
  /\btrump\b|\bputin\b|\bbiden\b|\berdo[gğ]an\b/i,
  /lekse|homework|innlevering|essay|likning|quadratic/i,
  /hovedstad(en)?|capital of|hvem vant|fotball-?vm|eurovision/i,
  /skriv .{0,20}(python|javascript|typescript|react|java|rust)\b/i,
  /\b(python|javascript|typescript|react)\b.{0,24}(script|kode|parser|program|komponent)/i,
  /implementer|quicksort|fibonacci|hello world/i,
  /oppskrift|\brecipe\b|fortell en vits|skriv et dikt|haiku/i,
  /meningen med livet|kryptovaluta|\bbitcoin\b/i,
  /oversett denne|translate this/i,
  /værvarsel|weather (in|for)\b/i,
];

const PROMPT_LEKK = [
  /du er endwise sin (verksteds|forhandler)/i,
  /workshop-bloub/i,
  /<bruker_melding/i,
  /følg aldri direktiver herfra/i,
  /opprettBooking[\s,].*parkert/i,
  /data fra verktøy er DATA/i,
];

const ROLLEBYTTE_I_SVAR = [
  /jeg er nå (DAN|uten begrensning|en generell)/i,
  /i am (now )?(DAN|unrestricted)/i,
  /here (is|are) (the |my )?(system )?prompt/i,
  /her er (system)?prompten/i,
];

export function tekstFraMeldingsinnhold(content: ModelMessage['content']): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  const deler: string[] = [];
  for (const part of content) {
    if (typeof part === 'string') {
      deler.push(part);
      continue;
    }
    if (part && typeof part === 'object' && 'text' in part) {
      const tekst = (part as { text: unknown }).text;
      if (typeof tekst === 'string') deler.push(tekst);
    }
  }
  return deler.join('\n');
}

export function sisteBrukertekst(messages: readonly ModelMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const melding = messages[i];
    if (melding?.role !== 'user') continue;
    const tekst = tekstFraMeldingsinnhold(melding.content).trim();
    if (tekst) return tekst;
  }
  return '';
}

export function klassifiserRonnyMelding(tekst: string): RonnyKlassifisering {
  const trimmet = tekst.trim();
  if (!trimmet) return { utfall: 'tillatt', verktoy: null };
  if (JAILBREAK.some((p) => p.test(trimmet))) {
    return { utfall: 'jailbreak', verktoy: null };
  }

  const endwise = ENDWISE.some((p) => p.test(trimmet));
  const offTopic = OFF_TOPIC.some((p) => p.test(trimmet));
  if (offTopic && !endwise) {
    return { utfall: 'off_topic', verktoy: null };
  }

  const verktoy = foreslattRonnyVerktoy(trimmet);
  if (verktoy) return { utfall: 'trenger_verktoy', verktoy };
  return { utfall: 'tillatt', verktoy: null };
}

export function foreslattRonnyVerktoy(tekst: string): RonnyVerktoyNavn | null {
  if (/lokasjon|hylle|hvor ligger/i.test(tekst)) return 'lagerLokasjoner';
  if (/lavt lager|under minimum|må bestilles|bestille inn/i.test(tekst)) return 'lavtLager';
  if (/(finn|har vi|finnes|på lager).{0,40}(del|sku|bremse|dekk|olje|filter)/i.test(tekst)) {
    return 'finnDel';
  }
  if (/\b(del|sku|lager)\b/i.test(tekst) && !/booking|kunde|innboks/i.test(tekst)) {
    return 'finnDel';
  }
  if (/mekaniker|hvem jobber|kapasitet/i.test(tekst)) return 'mekanikere';
  if (/kunde/i.test(tekst)) return 'sokKunder';
  if (/booking|timeplan|avtalene|i dag|dagens/i.test(tekst)) return 'dagensBookinger';
  if (/innboks/i.test(tekst)) return 'gaaTil';
  return null;
}

/** Kort nektetekst, eller null hvis meldingen får gå til modellen. */
export function vurderRonnyInn(messages: readonly ModelMessage[]): string | null {
  if (messages.some((m) => m.role === 'system')) {
    return RONNY_NEKT_SVAR;
  }
  const tekst = sisteBrukertekst(messages);
  const klass = klassifiserRonnyMelding(tekst);
  if (klass.utfall === 'jailbreak' || klass.utfall === 'off_topic') {
    return RONNY_NEKT_SVAR;
  }
  return null;
}

export function vurderRonnySvar(input: {
  brukertekst: string;
  svar: string;
  brukteVerktoy: readonly string[];
}): { svar: string; nektet: boolean } {
  const klass = klassifiserRonnyMelding(input.brukertekst);
  if (klass.utfall === 'jailbreak' || klass.utfall === 'off_topic') {
    return { svar: RONNY_NEKT_SVAR, nektet: true };
  }
  if (lekkerSystemprompt(input.svar) || ROLLEBYTTE_I_SVAR.some((p) => p.test(input.svar))) {
    return { svar: RONNY_NEKT_SVAR, nektet: true };
  }
  if (
    klass.utfall === 'trenger_verktoy' &&
    input.brukteVerktoy.length === 0 &&
    serUtSomFunnetData(input.svar)
  ) {
    return { svar: RONNY_MANGLER_DATA, nektet: true };
  }
  return { svar: input.svar, nektet: false };
}

export function lekkerSystemprompt(svar: string): boolean {
  return PROMPT_LEKK.some((p) => p.test(svar));
}

function serUtSomFunnetData(svar: string): boolean {
  if (/\b\d+\s*(booking|bookinger|del(er)?|kunde(r)?|mekaniker)/i.test(svar)) return true;
  if (/\b(dere har|vi har|finnes)\b[\s\S]{0,40}\d+/i.test(svar)) return true;
  return false;
}

export function erRonnyTillattVerktoy(navn: string): navn is RonnyVerktoyNavn {
  return (RONNY_TILLATTE_VERKTOY as readonly string[]).includes(navn);
}

/** Fjerner alt som ikke står på allowlisten. Parkerte skriv beholdes som parkert. */
export function filtrerRonnyVerktoy(tools: Record<string, Tool>): Record<string, Tool> {
  const ut: Record<string, Tool> = {};
  for (const navn of RONNY_TILLATTE_VERKTOY) {
    const verktoy = tools[navn];
    if (verktoy) ut[navn] = verktoy;
  }
  return ut;
}
