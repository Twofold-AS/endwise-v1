'use client';

import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { authClient, useSession } from '@/lib/auth-client';
import { LiveSync } from './_lib/live-sync';
import { LydProvider } from './_lib/lyd';
import { erForhandlerRutePaaPlattform, plattformToast } from './_lib/plattform';
import { useOrgRole } from './_lib/use-org-role';
import { MobileShell } from './_shell/mobile-shell';
import { PwaRegister } from './_shell/pwa-register';
import { Sidebar } from './_shell/sidebar';
import { SidebarStateProvider } from './_shell/sidebar-state';
import { TopBar } from './_shell/top-bar';

/**
 * Admin/forhandler-shell (TheFold-stil) + auth-/rolle-guard.
 * Ikke innlogget → /signin.
 * Ren mekaniker → låst til /min-dag med mobil-shell (kosmetisk;
 * RLS/adminProcedure er den ekte sperren server-side).
 * «Ren» er ikke en detalj
 * Guarden låste tidligere alle med `isMechanic` til /min-dag og ga dem
 * mobil-shellet — altså **ingen sidebar og ingen kontekstvelger**.
 * Det var riktig så lenge en mekaniker-profil bare fantes på mekanikere. Men
 * `isMechanic` betyr «har en rad i `mechanics`», ikke «skal kun se
 * mekanikerflaten». En forhandler-admin som også jobber på gulvet — eller en
 * Endwise-admin i dev-mode — ble låst ute fra sitt eget dashboard, og
 * kontekstvelgeren (F5-29) som finnes nettopp for å bytte mellom visningene,
 * var utilgjengelig.
 * Nå gjelder låsen kun den som ikke har noe annet sted å være: `dealer_staff`
 * med mekaniker-profil. Admins får full sidebar, og bytter til
 * mekanikervisningen via kontekstvelgeren som alle andre visninger.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const { data: session, isPending } = useSession();
  const { isMechanic, isAdmin, isLoading, needsOnboarding, erPlattform } = useOrgRole();
  const [plattformVarsel, setPlattformVarsel] = useState<string | null>(null);
  const visPlattformVarsel = useCallback(() => {
    setPlattformVarsel(plattformToast());
  }, []);

  /** Har mekaniker-profil og ingen admin-rolle → mekanikerflaten er hele appen. */
  const kunMekaniker = isMechanic && !isAdmin;

  /**
   * utloggings-guarden — og hvorfor den spør serveren før den kaster deg ut.
   * Guarden gjorde tidligere `if (!isPending && !session?.user) redirect`. Den
   * stolte altså på Better-Auths klient-store alene. Ved en myk navigasjon inn
   * i appen er den storen uinitialisert i ett render — «ingen bruker» betyr da
   * «ikke hentet ennå», ikke «ikke innlogget». Resultatet var at en helt gyldig
   * innlogging ble kastet rett tilbake til /signin (dobbel-login-bugen).
   * Innlogging gjør nå en full sidelast, som fjerner kappløpet i praksis. Denne
   * sjekken er det andre laget: vi kaster ingen ut på et fravær av data — bare
   * på et bekreftet nei. Én eksplisitt `getSession` mot serveren, og først
   * hvis den sier nei går vi til /signin.
   * Kostnaden er ett ekstra kall, og bare i feilstien. Prisen for å ta feil er
   * at brukeren mister det hun holdt på med.
   */
  const [bekreftetUtlogget, setBekreftetUtlogget] = useState(false);
  const sjekker = useRef(false);

  useEffect(() => {
    if (isPending) return;
    if (session?.user) {
      setBekreftetUtlogget(false);
      sjekker.current = false;
      return;
    }
    if (sjekker.current) return;
    sjekker.current = true;

    // Storen sier «ingen bruker». Spør serveren én gang før vi tror på det.
    void authClient
      .getSession()
      .then((res) => setBekreftetUtlogget(!res?.data?.user))
      // Nettverksfeil er ikke det samme som utlogget — da blir vi stående.
      .catch(() => setBekreftetUtlogget(false))
      .finally(() => {
        sjekker.current = false;
      });
  }, [isPending, session]);

  useEffect(() => {
    if (bekreftetUtlogget) router.replace('/signin' as Route);
  }, [bekreftetUtlogget, router]);

  useEffect(() => {
    if (!isLoading && kunMekaniker && !pathname.startsWith('/min-dag')) {
      router.replace('/min-dag' as Route);
    }
  }, [isLoading, kunMekaniker, pathname, router]);

  useEffect(() => {
    if (isLoading) return;
    if (needsOnboarding && !pathname.startsWith('/oppstart')) {
      router.replace('/oppstart' as Route);
    }
  }, [isLoading, needsOnboarding, pathname, router]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: les query på nytt etter redirect
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('varsel') === 'plattform') {
      setPlattformVarsel(plattformToast());
    }
  }, [pathname]);

  // Mekanikeren får mobil-shell (bottom-nav), ikke admin-sidebaren.
  // Server håndhever grensen (RLS + adminProcedure); dette er UI-formen.
  // Lyd gjelder begge shellene. Mekanikeren er den som oftest har
  // hendene fulle og skjermen i lomma; å la lyden bare finnes i adminpanelet
  // ville vært å gi varselet til den som allerede ser skjermen.
  if (kunMekaniker) {
    return (
      <LydProvider>
        <LiveSync>
          <MobileShell>{children}</MobileShell>
        </LiveSync>
      </LydProvider>
    );
  }

  /*
   * Service-worker-håndteringen hører hjemme her, ikke bare i
   * MobileShell (flyttet ).
   * Sw-en registreres med `scope: '/'` og kontrollerer da hver side i appen
   * også for en admin som aldri ser mekanikerflaten. Lå avregistreringen kun i
   * MobileShell, ville en admin med en gammel sw installert aldri fått ryddet
   * opp, og fortsatt blitt servert gammel kode fra sw-cachen.
   */

  /*
   * Sidebaren er nå ytterst og går fra topp til bunn. Topbaren ligger
   * Innenfor innholdskolonnen, ikke over hele skjermen: den beskriver bare hvor
   * du er i innholdet, ikke i appen. Rekkefølgen i DOM-en sier det samme som
   * hierarkiet i hodet.
   * Kommandopaletten (K som globalt søk) er fjernet på eiers
   * beslutning. K åpner nå quick actions i sidebaren i stedet. Konsekvensen er
   * at de parkerte rutene (marked/*
   * , admin/*) ikke lenger har en inngang i UI-et
   * de nås kun ved å skrive URL-en. Se sesjonsrapporten.
   */
  /*
   * `<Suspense>` rundt Sidebar og TopBar er påkrevd, ikke pynt. Begge leser
   * `useSearchParams` (kanal-/visningsvalg i navet, breadcrumb), og uten en
   * suspense-grense trekker det hele app-treet ut av statisk prerender
   * `next build` feiler med «useSearchParams should be wrapped in a suspense
   * boundary» på hver eneste side, også de som ikke rører query.
   */
  return (
    <LydProvider>
      <LiveSync>
        <SidebarStateProvider>
          <PwaRegister />
          <div className="flex h-screen w-screen overflow-hidden bg-bg text-fg">
            <Suspense
              fallback={<div className="w-[248px] shrink-0 border-border border-r bg-sidebar" />}
            >
              <PlattformRuteVakt
                erPlattform={erPlattform}
                isLoading={isLoading}
                onBlokkert={visPlattformVarsel}
              />
              <Sidebar />
            </Suspense>
            <div className="flex min-w-0 flex-1 flex-col">
              <Suspense fallback={<div className="h-14 shrink-0 border-border border-b bg-bg" />}>
                <TopBar />
              </Suspense>
              <main className="min-w-0 flex-1 overflow-y-auto">
                {plattformVarsel ? (
                  <div className="flex h-row items-center justify-between bg-warn-soft px-4 text-warn">
                    <p className="text-label">{plattformVarsel}</p>
                    <button
                      type="button"
                      className="text-[12px] underline-offset-2 hover:underline"
                      onClick={() => setPlattformVarsel(null)}
                    >
                      Lukk
                    </button>
                  </div>
                ) : null}
                {children}
              </main>
            </div>
          </div>
        </SidebarStateProvider>
      </LiveSync>
    </LydProvider>
  );
}

/**
 * Leser `useSearchParams` inne i Suspense (samme grense som Sidebar).
 * Dealer-fakturering (Abonnement / Tjenester & priser) på plattform skal
 * vekk — også `?fane=` på `/innstillinger`.
 */
function PlattformRuteVakt({
  erPlattform,
  isLoading,
  onBlokkert,
}: {
  erPlattform: boolean;
  isLoading: boolean;
  onBlokkert: () => void;
}) {
  const pathname = usePathname() ?? '';
  const search = useSearchParams()?.toString() ?? '';
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !erPlattform) return;
    if (erForhandlerRutePaaPlattform(pathname, search)) {
      onBlokkert();
      router.replace('/endwise?varsel=plattform' as Route);
    }
  }, [isLoading, erPlattform, pathname, search, router, onBlokkert]);

  return null;
}
