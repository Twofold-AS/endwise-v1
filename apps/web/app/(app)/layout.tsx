'use client';

import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { authClient, useSession } from '@/lib/auth-client';
import { LiveSync } from './_lib/live-sync';
import { LydProvider } from './_lib/lyd';
import { erForhandlerRutePaaPlattform, plattformToast } from './_lib/plattform';
import { useOrgRole } from './_lib/use-org-role';
import { InboxFilterProvider } from './_shell/inbox-filter';
import { erTillattMekanikerSti } from './_shell/nav';
import { PHONE_SHELL_ROT } from './_shell/phone-home';
import { PhoneShell } from './_shell/phone-shell';
import { PwaRegister } from './_shell/pwa-register';
import { DestinasjonSeksjonBar } from './_shell/seksjon-bar';
import { Sidebar } from './_shell/sidebar';
import { SidebarStateProvider } from './_shell/sidebar-state';
import { WorkshopBloub } from './_workshop/workshop-bloub';

/**
 * Admin/forhandler-shell (TheFold-stil) + auth-/rolle-guard.
 * Ikke innlogget → /signin.
 * Ren mekaniker → eget skall (Jonas 28.08). Ingen visningsvelger.
 * dealer_admin som også har mekaniker-rad er fortsatt forhandler.
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
    if (!isLoading && kunMekaniker && !erTillattMekanikerSti(pathname)) {
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

  // Jonas 28.08: mekaniker får samme desktop-sidebar, eget skall.
  /*
   * Service-worker-håndteringen hører hjemme her, ikke bare i
   * MobileShell (flyttet ).
   * Sw-en registreres med `scope: '/'` og kontrollerer da hver side i appen
   * også for en admin som aldri ser mekanikerflaten. Lå avregistreringen kun i
   * MobileShell, ville en admin med en gammel sw installert aldri fått ryddet
   * opp, og fortsatt blitt servert gammel kode fra sw-cachen.
   */

  /*
   * Desktop-sidebar er persistent venstre skinne. Overlay/fullskjerm-drawer
   * er telefon. PhoneShell (logo/tilbake/åpne) er `md:hidden`.
   * Fast toppbar med 24px-logo på telefon. Tilbake er pil-SVG uten tekst.
   * PhoneBevel er borte. DestinasjonSeksjonBar under Ronny på alle sider.
   * Workshop-stripen (Grainient, KI-Ronny midtstilt i stripen) er ~44px på telefon og
   * 32px på desktop. K åpner quick actions i sidebaren på desktop.
   */
  /*
   * `<Suspense>` rundt Sidebar og WorkshopBloub er påkrevd, ikke pynt. Begge
   * leser `useSearchParams`, og uten en suspense-grense trekker det hele
   * app-treet ut av statisk prerender.
   */
  return (
    <LydProvider>
      <LiveSync>
        <SidebarStateProvider>
          <InboxFilterProvider>
            <PwaRegister />
            <div className={PHONE_SHELL_ROT}>
              <Suspense fallback={null}>
                <PlattformRuteVakt
                  erPlattform={erPlattform}
                  isLoading={isLoading}
                  onBlokkert={visPlattformVarsel}
                />
                <Sidebar />
              </Suspense>
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <Suspense
                  fallback={
                    <div className="h-11 max-h-[44px] shrink-0 bg-bg md:h-control md:max-h-[32px]" />
                  }
                >
                  <PhoneShell />
                  <WorkshopBloub />
                  <DestinasjonSeksjonBar />
                </Suspense>
                <div
                  data-ronny-side-scroll
                  className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto"
                >
                  <main className="min-w-0 flex-1">
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
            </div>
          </InboxFilterProvider>
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
