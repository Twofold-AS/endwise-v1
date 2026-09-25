/** PR #178 review — visuell GO, ikke produkt-rute. */

export type PrReviewDel = {
  id: string;
  nr: string;
  tittel: string;
  rute: string;
  liveRute: string;
  nytt: string;
  ekte: string;
  stub: string;
  test: string;
};

export const PR_REVIEW_TITTEL = 'PR #178 – Claude Design inn i Endwise';

export const PR_REVIEW_INGRESS =
  'Én gjennomgang av hele Claude Design-leveransen på eksisterende Endwise-flater. Preview-rutene er offentlige uten innlogging (visuell GO). Live-rutene krever innlogging og treffer ekte tRPC der det står. Chrome 1+2 og FORHANDLER_NAV er urørt. Ikke merget.';

export const PR_REVIEW_DELER: readonly PrReviewDel[] = [
  {
    id: 'verkstedet',
    nr: '1',
    tittel: 'Verkstedet / hjem',
    rute: '/pulse-preview',
    liveRute: '/home',
    nytt: 'Analyse-kortet heter «Tall»: Innboks-hode + 2×2 Visninger · Bookinger · Returer · Credits. CTA «Alle tall» peker på /statistikk. Låst stabel (PPF, 08–19, Avvik/Forespørsel, Endringer, Innboks, Lager, På jobb, Jobb) er beholdt.',
    ekte: 'Live /home: Bookinger siste 30 dager mot bookings. Preview her er visuell GO med mock-tall.',
    stub: 'Visninger, Returer og Credits er ærlig «Ingen API». Amicro / AnalyseKort / /analyse er ikke slettet.',
    test: 'Sjekk at hjem ikke er omskrevet til Deler/Svarhastighet/Gulv. Chrome 1+2 urørt. Tall-rutenettet er 2×2, ikke nye chrome-piller.',
  },
  {
    id: 'kunder',
    nr: '2',
    tittel: 'Kunder',
    rute: '/kunder-preview',
    liveRute: '/kunder',
    nytt: 'Høyre alfa-rail (ikke topp-chips) og profil-seksjoner Kontakt · Kjøretøy · Jobber · Meldinger. Søkeplaceholder «Navn, telefon, e-post eller reg.nr». Skjemaer NyKunde / RegistrerKjoretoy / KundeEndre urørt.',
    ekte: 'Live /kunder: customers.list (søk, kilde, Nyeste/Eldste, limit 200). Kundekort customers.byId. Preview er mock-liste.',
    stub: 'Ingen customers.delete — slett/angre er hoppet over. Klient-pager 25 ligger som hjelper, ikke som list-UX etter Fix A.',
    test: 'Søk, sortering Nyeste/Eldste, åpne en rad. Ingen «Slett kunde». Chrome Alle kunder · Opprett kunde · Registrer kjøretøy urørt.',
  },
  {
    id: 'timeplan',
    nr: '3',
    tittel: 'Timeplan / Endringer',
    rute: '/jobber-preview',
    liveRute: '/jobber',
    nytt: 'Uke-rail (7 dager, mandag først) + månedspicker. Dagsliste med sortering tid/kunde/status/mekaniker. Endringer: Avvik · Forespørsler · Logg som hale-lenke.',
    ekte: 'Live /jobber: bookings.calendar. Godkjenn/Avslå = bookings.resolveChange. Meld-skjema = bookings.reportChange. Preview er mock-dagsrader.',
    stub: 'Ingen oppdiktet godkjenning. Kalender og booking-status er urørt.',
    test: 'Bytt dag i uke-rail, åpne måned, sorter dagslista. Chrome Timeplan · Opprett jobb · Endringer urørt.',
  },
  {
    id: 'innboks',
    nr: '4',
    tittel: 'Innboks',
    rute: '/innboks-preview',
    liveRute: '/innboks',
    nytt: 'Filter-chips Alle · Kunder · Intern · Support · Løst i lista (ikke chrome-piller). Sortering Nyeste · Eldste · Uleste først. Uleste rader med kant + sisteTekst. Deltaker-chips i tråd.',
    ekte: 'Live /innboks: listThreads, forkThread (Inviter). Preview er visuell GO.',
    stub: 'Løst er ærlig stub (ingen resolved-kolonne). Fjern / Forlat / Løst-handling = «ingen API». Pager 10 + sesjon-Angre på skjul — ikke fake delete.',
    test: 'Trykk chips, Uleste først, ulest-kant. Chrome Alle meldinger · Ny melding · Sortering · Slett urørt. Compose urørt.',
  },
  {
    id: 'ny-jobb',
    nr: '5',
    tittel: 'Ny jobb',
    rute: '/visual-forms-preview',
    liveRute: '/bookinger/ny',
    nytt: 'jobSlots(): hverdag 08–19, lør 10–15, søn stengt, 30-min. Alle aktive mekanikere. Kompetanse fra tjeneste-skills. Ingen overlap mot calendar. Kjøretøy-kaskade type→merke→modell→år. Nested park. ?kunde= prefill.',
    ekte: 'Live /bookinger/ny: vehicles.list, competence, bookings.calendar, bookings.create urørt. Preview viser flyten uten innlogging.',
    stub: 'Ingen vakt-/skift-API — alle aktive mekanikere. Tom liste når ingen kvalifiserer, ikke oppdiktede navn.',
    test: 'Dato bare dager med slot. Kaskade og park midt i flyten. Chrome Timeplan · Opprett jobb · Endringer urørt.',
  },
  {
    id: 'lager',
    nr: '6',
    tittel: 'Lager',
    rute: '/lager-preview',
    liveRute: '/lager',
    nytt: 'Lager-hub: På lager · Tilgjengelig · Reservert · Under minimum. Seksjoner Deler · Inn- og utlogg · Bestill · Kjøretøy til salgs. Deler-detalj og Ny del.',
    ekte: 'Live /lager: inventory.summary, listParts (kunLav), inventory.part, createPart. Preview er mock-hub.',
    stub: 'Bestill og salgskanaler (Finn.no · Butikk · Reservert) = «ingen API». Ingen Hellanor-live. Chrome-piller urørt.',
    test: 'Stats og Deler. Ingen falske lager-tall. Ingen nye chrome-piller.',
  },
  {
    id: 'butikk',
    nr: '7',
    tittel: 'Butikk',
    rute: '/butikk-preview',
    liveRute: '/butikk',
    nytt: 'Butikk-hub: pageTitle Butikk, «N varer · M kjøretøy», preview av 3 + Se alle. Katalog, kasse og widget er urørt.',
    ekte: 'Live /butikk: shop.catalog. Preview er visuell GO.',
    stub: 'Ingen oppdiktet kasse-flyt her. Ingen Hellanor/MC-Import live.',
    test: 'Hub-overskrift og Se alle. Chrome-piller urørt.',
  },
  {
    id: 'tjenester',
    nr: '8',
    tittel: 'Tjenester',
    rute: '/tjenester-preview',
    liveRute: '/prisliste',
    nytt: 'Søk + pageSub «N tjenester tilbys» på eksisterende /prisliste. Kategorier Alle/MC/Båt/ATV. Ny → ?fane=opprett. Detalj varighet/pris/skills.',
    ekte: 'Live /prisliste: services.list. Preview er visuell GO.',
    stub: 'Ingen Claude «Tjenester»-chrome-pille. Ingen fake katalog. Chrome Alle tjenester · Opprett tjenester urørt.',
    test: 'Søk og kategorier. Bekreft at top-bar 2 ikke har fått en ny Tjenester-pille.',
  },
  {
    id: 'org',
    nr: '9',
    tittel: 'Org / ansatte',
    rute: '/org-preview',
    liveRute: '/organisasjon',
    nytt: 'Org-hub: Ansatte · Timeplan ansatte (/jobber) · Abonnement · Integrasjoner. Firmaopplysninger + Antall ansatte. Ansatte-pageSub «N · M på jobb nå».',
    ekte: 'Live: forhandler.get, team.list (status på_jobb/opptatt), team.fjern, competence.setMechanicSkill, billing.plans/katalog.',
    stub: 'Sett tid og vaktliste per ukedag = «ingen API». Integrasjoner uten av/på-brytere. Ingen Hellanor/Mailchimp-live.',
    test: 'Hub-lenker lander på eksisterende ruter. Ingen nye chrome-piller. Timeplan ansatte = /jobber.',
  },
  {
    id: 'fix-a',
    nr: 'A',
    tittel: 'Fix A — Kunder alfa-rail',
    rute: '/kunder-preview',
    liveRute: '/kunder',
    nytt: 'Apple Contacts-rail i list-viewport: like flex-spor, sticky i lista — ikke midtstilt absolute. Full norsk indeks # + A–Å (Q/W/X/Z/Æ/Ø). Tomme dimmet. Scroll-to-seksjon + sticky hoder. # = topp. Søket shrink-0 (ingen grå stripe).',
    ekte: 'Samme customers.list som Bit 2 på live. Preview-mock med norsk alfabet.',
    stub: 'Bokstavfilter og 25-pager er vekk fra list-UX. Next.js Dev Tools (nextjs-portal) skjules på preview.',
    test: 'På ~390×844: A synlig ved første rader, rail i full list-høyde. Trykk S — Siri flush under søk, ingen grå stripe. Tomt søk: kompakt felt, dimmet rail. Ingen svart Dev Tools-sirkel over bokstavene.',
  },
];
