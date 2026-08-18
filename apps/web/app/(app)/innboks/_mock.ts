import type { Kanal } from './_kanal';
import type { ThreadKind } from './_lib';

/**
 * F6-01 — Plassholder-samtaler for innboks-sidebaren.
 *
 * ⚠️ **OPPDIKTET.** Vises KUN når `messages.listThreads` returnerer tomt (ingen
 * database koblet, eller en helt ny forhandler). Hver rad merkes «Eksempel» i
 * UI-et — en tom innboks skal vise formen, ikke en tom flate, men den skal
 * heller aldri utgi seg for å ha ekte samtaler.
 *
 * Deterministisk (ingen `Math.random`/`Date.now`) så SSR og klient matcher.
 *
 * ── Kanal (endret 08.08.2026) ─────────────────────────────────────────────
 * Kanalen på disse radene er oppdiktet som alt annet her, men den er ikke
 * lenger en egen prototype-TYPE: `messages.channel` og `threads.channel`
 * finnes nå i databasen, og eksempelradene bruker den ekte `Kanal`-typen fra
 * `_kanal.tsx`. Det er nettopp poenget med en eksempelrad — den skal ha samme
 * form som en ekte rad, ikke sin egen.
 *
 * `sisteKanal` er kanalen siste melding kom på; `kanal` er trådens svarkanal.
 * Rad 4 har dem ulike med vilje: kunden svarte fra appen på en SMS-tråd, og
 * lista skal vise at svaret likevel må gå ut som SMS.
 */
export type MockTrad = {
  id: string;
  /** Kort saks-ID, det forhandleren faktisk refererer til i telefonen. */
  ref: string;
  kind: ThreadKind;
  avsender: string;
  utdrag: string;
  nar: string;
  ulest: number;
  /** Trådens svarkanal. */
  kanal: Kanal;
  /** Kanalen siste melding faktisk kom på. */
  sisteKanal: Kanal;
};

export const MOCK_TRADER: MockTrad[] = [
  {
    id: 'mock-1',
    ref: 'SAK-2841',
    kind: 'customer_dealer',
    avsender: 'Kunde · EL 12345',
    utdrag: 'Hei! Rekker dere å se på bremsene før helgen? Den ulyden er tilbake.',
    nar: 'I dag 09:41',
    ulest: 2,
    kanal: 'sms',
    sisteKanal: 'sms',
  },
  {
    id: 'mock-2',
    ref: 'SAK-2839',
    kind: 'mechanic_dealer',
    avsender: 'Jonas (mekaniker)',
    utdrag: 'Trenger godkjenning på ekstra time — rusten er verre enn antatt.',
    nar: 'I dag 08:12',
    ulest: 1,
    kanal: 'app',
    sisteKanal: 'app',
  },
  {
    id: 'mock-3',
    ref: 'SAK-2836',
    kind: 'dealer_admin',
    avsender: 'Endwise support',
    utdrag: 'Vi har sett på Quick-synkingen. Nøkkelen din er reaktivert.',
    nar: 'I går 16:30',
    ulest: 0,
    kanal: 'email',
    sisteKanal: 'email',
  },
  {
    id: 'mock-4',
    ref: 'SAK-2830',
    kind: 'customer_dealer',
    avsender: 'Kunde · BS 88210',
    utdrag: 'Takk for rask hjelp — sykkelen går som ny nå.',
    nar: 'I går 11:05',
    ulest: 0,
    kanal: 'sms',
    sisteKanal: 'app',
  },
  {
    id: 'mock-5',
    ref: 'SAK-2822',
    kind: 'customer_dealer',
    avsender: 'Kunde · widget',
    utdrag: 'Har dere ledig time for EU-kontroll neste uke?',
    nar: '14. juli 15:48',
    ulest: 0,
    kanal: 'web',
    sisteKanal: 'web',
  },
];
