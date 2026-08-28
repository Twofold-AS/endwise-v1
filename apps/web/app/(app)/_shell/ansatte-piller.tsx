'use client';

import { usePathname } from 'next/navigation';
import { useOrgRole } from '../_lib/use-org-role';
import { FORHANDLER_NAV, MEKANIKER_NAV, shellForBruker } from './nav';
import { SidePiller } from './side-piller';

const ANSATTE = FORHANDLER_NAV.find((i) => i.key === 'team');

export function AnsattePiller() {
  const pathname = usePathname() ?? '';
  const piller = ANSATTE?.pills ?? [];
  const aktiv =
    piller.find((p) => {
      const path = p.href.split('?')[0] ?? p.href;
      return pathname === path || pathname.startsWith(`${path}/`);
    })?.href ?? piller[0]?.href;
  return <SidePiller ariaLabel="Ansatte" piller={piller} aktivHref={aktiv ?? '/innstillinger/team'} />;
}

export function KunderPiller() {
  const pathname = usePathname() ?? '';
  const kunder = FORHANDLER_NAV.find((i) => i.key === 'kunder');
  const piller = kunder?.pills ?? [];
  const aktiv = pathname.startsWith('/kjoretoy') ? '/kjoretoy' : '/kunder';
  return <SidePiller ariaLabel="Kunder" piller={piller} aktivHref={aktiv} />;
}

function brukMekanikerNav() {
  const { role, jobbfunksjon, isMechanic, erPlattform } = useOrgRole();
  return (
    shellForBruker({
      role,
      jobFunction: jobbfunksjon,
      isMechanic,
      erPlattform,
    }) === 'mekaniker'
  );
}

export function LagerPiller() {
  const pathname = usePathname() ?? '';
  const nav = brukMekanikerNav() ? MEKANIKER_NAV : FORHANDLER_NAV;
  const lager = nav.find((i) => i.key === 'lager');
  const piller = lager?.pills ?? [];
  const aktiv = piller.find((p) => pathname === (p.href.split('?')[0] ?? p.href))?.href ?? '/lager';
  return <SidePiller ariaLabel="Lager" piller={piller} aktivHref={aktiv} />;
}

export function ButikkPiller() {
  const pathname = usePathname() ?? '';
  const nav = brukMekanikerNav() ? MEKANIKER_NAV : FORHANDLER_NAV;
  const butikk = nav.find((i) => i.key === 'butikk');
  const piller = butikk?.pills ?? [];
  const aktiv = pathname.startsWith('/butikk/kasse') ? '/butikk/kasse' : '/butikk';
  return <SidePiller ariaLabel="Butikk" piller={piller} aktivHref={aktiv} />;
}
