'use client';

import { play, setEnabled, setVolume } from 'cuelume';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { useEventStream } from './use-event-stream';

/**
 * F5-19 — VARSLINGSLYDER (cuelume, MIT, brukergodkjent §2-avhengighet).
 *
 * ── Hvorfor lyd i det hele tatt ───────────────────────────────────────────
 * En forhandler sitter ikke og stirrer på innboksen. En melding som kommer inn
 * mens skjermen er på en annen fane er i praksis usett til noen tilfeldigvis
 * ser etter. En kort lyd er det billigste varselet som finnes.
 *
 * ── ⚠️ HVORFOR DET VAR HELT STILLE (fire feil, funnet 09.08.2026) ─────────
 *
 * 1. **Web Audio var aldri låst opp.** cuelunes `play()` starter med
 *    `if (navigator.userActivation?.hasBeenActive === false) return;` — den gir
 *    opp UMIDDELBART hvis brukeren ikke har rørt siden. Etter en full sidelast
 *    (og kontekstbytte gjør nettopp `window.location.assign`) er `hasBeenActive`
 *    falsk igjen. To vinduer som står stille og venter på en melding er derfor
 *    garantert lydløse — nøyaktig scenarioet en toparts-test er.
 *    → Fikset med `LydOpplaser` under: første klikk/tast i appen spiller en
 *      uhørbar lyd, som lager OG resumer AudioContexten inne i en ekte gest.
 *
 * 2. **Volumet ble ganget med seg selv.** Vi kalte både `setVolume(0.35)` OG
 *    `play(navn, { volume: 0.35 })`. Motoren regner
 *    `masterGain * globalVolume * options.volume` → 0,35 × 0,35 = **0,1225**.
 *    Ikke stille, men langt under det som høres i et verksted.
 *    → Volumet settes nå ÉN gang, globalt. Per-lyd-volum brukes kun der vi
 *      bevisst vil ha noe svakere enn resten (send-kvitteringen).
 *
 * 3. **Prøvelyden slo av seg selv.** `test()` gjorde `setEnabled(true)` →
 *    `play()` → `setEnabled(forrigeVerdi)`. Men når konteksten er suspendert
 *    spiller `play()` ASYNKRONT (`resume().then(...)`), og callbacken sjekker
 *    `enabled` på nytt. Restoren rakk å kjøre først, så den aller første
 *    prøvelyden — den man trykker for å sjekke at lyd virker — ble slukt.
 *    → Ingen restore lenger; `useEffect` på `pa` setter uansett riktig verdi.
 *
 * 4. **Ingen send-lyd fantes.** Serveren hopper over forfatteren når den
 *    publiserer (du skal ikke varsles om din egen melding), så avsenderen fikk
 *    aldri noe. Det er riktig for VARSELET, men avsenderen trenger en
 *    KVITTERING. → `sendt()` under.
 *
 * ── Hvorfor det fortsatt er lite lyd ──────────────────────────────────────
 * Et verksted er allerede et støyende sted, og en lyd man hører tjue ganger om
 * dagen slutter å bety noe. Derfor kun: mottatt melding, sendt melding, og
 * suksess/feil på egne handlinger.
 *
 * ⛔ Ingen `bind()`. Cuelume kan koble lyd på alle `data-cuelume-*`-elementer
 * automatisk — det er nettopp det vi IKKE vil. Hover- og klikklyder over hele
 * panelet er akkurat den slags som får folk til å skru av lyden helt, og da
 * mister de også varselet som faktisk betyr noe.
 */

/** Hovedvolum. Settes ÉN gang på motoren — se feil 2 over. */
const VOLUM = 0.35;

/**
 * Send-kvitteringen skal være svakere enn varselet. Du vet at du trykket send;
 * du vet ikke at det kom en melding. Relativt til `VOLUM`.
 */
const SEND_VOLUM = 0.5;

/** Uhørbar, men ikke null — `play()` returnerer tidlig på nøyaktig 0. */
const OPPLAS_VOLUM = 0.0001;

type Lydnavn = 'arrival' | 'loading' | 'success' | 'error';

type Lydkontekst = {
  /** Er lyd på for denne brukeren? */
  pa: boolean;
  /** Ny melding fra noen ANDRE. Varselet. */
  nyMelding: () => void;
  /** Du sendte en melding. Kvitteringen — svakere enn varselet. */
  sendt: () => void;
  /** Handling fullført. Diskret — brukes sparsomt. */
  suksess: () => void;
  /** Handling feilet. */
  feil: () => void;
  /** Spill en prøvelyd. Brukes av av/på-bryteren. */
  test: () => void;
};

const Ctx = createContext<Lydkontekst>({
  pa: false,
  nyMelding: () => {},
  sendt: () => {},
  suksess: () => {},
  feil: () => {},
  test: () => {},
});

/**
 * ⚠️ **LÅSER OPP WEB AUDIO.** Uten denne er alt annet i fila teoretisk.
 *
 * Nettlesere lager ikke — og resumer ikke — en AudioContext utenfor en ekte
 * brukergest. cuelume prøver å resume inne i `play()`, men rekker aldri dit:
 * `hasBeenActive === false` gir tidlig retur.
 *
 * Vi spiller derfor en lyd på volum 0.0001 ved FØRSTE klikk eller tastetrykk
 * hvor som helst i appen. Den er uhørbar, men den går gjennom hele veien:
 * `getAudioContext()` opprettes, `resume()` kalles inne i gesten, og
 * konteksten står `running` når det faktisk kommer en melding.
 *
 * `enabled` settes midlertidig true — ellers returnerer `play()` med én gang og
 * konteksten blir aldri laget. Riktig verdi settes tilbake straks etter, og
 * `useEffect`-en på `pa` er uansett fasiten.
 *
 * `once: true` + `capture: true`: én gang, og før noe annet rekker å stoppe
 * hendelsen. `pointerdown` framfor `click` fordi et klikk som starter på en
 * knapp og slippes utenfor aldri blir et `click`.
 *
 * ⚠️ **Kjører UANSETT om lyd er på eller av**, og det er med vilje. Gatet vi på
 * `pa`, ville et klikk som skjer FØR `session.me` har svart hoppet over
 * opplåsingen — og `once: true` gir ingen ny sjanse. Kostnaden er én stum
 * AudioContext; gevinsten er at bryteren virker umiddelbart når den skrus på.
 *
 * ⛔ Det vi IKKE kan fikse: kommer det en melding før brukeren har rørt siden i
 * det hele tatt, er den stille. Det er nettleserens autoplay-policy, ikke vår
 * kode. Første klikk hvor som helst løser det for resten av økta.
 */
function laasOppLyd(gjenopprettTil: boolean) {
  try {
    setEnabled(true);
    play('tick', { volume: OPPLAS_VOLUM });
  } catch {
    /* Web Audio kan være avslått i nettleseren. Ikke noe å gjøre. */
  } finally {
    setEnabled(gjenopprettTil);
  }
}

export function LydProvider({ children }: { children: ReactNode }) {
  const me = trpc.session.me.useQuery(undefined, { retry: false });
  // Standard PÅ, men først når vi VET svaret. Under lasting er den av, slik at
  // en treg forespørsel aldri gir en lyd brukeren har skrudd av.
  const pa = me.data?.varslingslyder ?? false;

  const paRef = useRef(pa);
  paRef.current = pa;

  useEffect(() => {
    setEnabled(pa);
    // ⚠️ ÉN gang, globalt. Se feil 2 i filkommentaren — per-lyd-volum i
    // tillegg ganget verdien med seg selv.
    setVolume(VOLUM);
  }, [pa]);

  /** Låser opp Web Audio ved første gest. Se `laasOppLyd`. */
  useEffect(() => {
    const paa = () => laasOppLyd(paRef.current);
    const opts = { once: true, capture: true } as const;
    window.addEventListener('pointerdown', paa, opts);
    window.addEventListener('keydown', paa, opts);
    return () => {
      window.removeEventListener('pointerdown', paa, opts);
      window.removeEventListener('keydown', paa, opts);
    };
  }, []);

  /**
   * ⚠️ Alle avspillinger går gjennom denne. Den sjekker `paRef` og ikke `pa`
   * direkte, slik at en callback som ble laget før brukeren skrudde av lyden
   * ikke fortsetter å spille med en gammel verdi i lukningen.
   */
  const spill = useCallback((navn: Lydnavn, relativtVolum?: number) => {
    if (!paRef.current) return;
    try {
      // Uten `volume` bruker motoren `globalVolume` alene — det vi vil ha.
      play(navn, relativtVolum === undefined ? undefined : { volume: relativtVolum });
    } catch {
      // Web Audio kan være blokkert (ingen brukergest ennå, eller avslått i
      // nettleseren). En manglende lyd skal aldri rive ned en visning.
    }
  }, []);

  /**
   * ⚠️ Lyden lytter APP-BREDT, ikke bare i innboksen. Det er hele poenget: en
   * melding som kommer inn mens du står på Saker eller Lager er nettopp den du
   * ellers ikke oppdager. Deler den samme SSE-tilkoblingen som alt annet — se
   * `use-event-stream.ts`.
   *
   * ⛔ Serveren sender ikke event for dine EGNE meldinger (`postMessage` hopper
   * over forfatteren), så dette fyrer kun for mottakeren. Avsenderens
   * kvittering er `sendt()`, som kalles fra svarfeltet.
   */
  const onEvent = useCallback(
    (event: { type: string }) => {
      if (event.type === 'message.created') spill('arrival');
    },
    [spill],
  );
  useEventStream(onEvent);

  const verdi: Lydkontekst = {
    pa,
    nyMelding: useCallback(() => spill('arrival'), [spill]),
    // Cue byttet fra `press` til `loading` 09.08.2026 (eiers valg). Volumet er
    // uendret — kvitteringen skal fortsatt være svakere enn varselet.
    sendt: useCallback(() => spill('loading', SEND_VOLUM), [spill]),
    suksess: useCallback(() => spill('success'), [spill]),
    feil: useCallback(() => spill('error'), [spill]),
    /**
     * Prøvelyden spiller UANSETT lagret innstilling — den er svaret på «hvordan
     * høres den ut?», og kalles fra bryteren i det øyeblikket lyd skrus på.
     *
     * ⚠️ Ingen restore av `enabled` etterpå. Se feil 3 i filkommentaren:
     * `play()` er asynkron når konteksten er suspendert, og en restore rett
     * etterpå slukte den aller første prøvelyden. `useEffect`-en på `pa` setter
     * riktig verdi ved neste render uansett.
     */
    test: useCallback(() => {
      try {
        setEnabled(true);
        play('arrival');
      } catch {
        /* se over */
      }
    }, []),
  };

  return <Ctx.Provider value={verdi}>{children}</Ctx.Provider>;
}

export function useLyd(): Lydkontekst {
  return useContext(Ctx);
}
