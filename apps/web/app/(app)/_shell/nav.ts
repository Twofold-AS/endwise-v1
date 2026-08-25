import {
  ArrowLeftRight,
  Building2,
  CalendarDays,
  Car,
  ChartLine,
  CircleUser,
  ClipboardList,
  FilePlus,
  Flag,
  Gauge,
  Handshake,
  HardHat,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  type LucideIcon,
  MapPin,
  MessageSquarePlus,
  Package,
  Settings,
  ShieldCheck,
  Store,
  Tags,
  UserCog,
  UserPlus,
  Users,
  Wrench,
} from '@endwise/ui';

export type OrgRole =
  | 'customer'
  | 'dealer_staff'
  | 'dealer_admin'
  | 'endwise_admin'
  | 'endwise_support';

/**
 * F5-13 — SIDEBAR-FØRST NAVIGASJON.
 *
 * Erstatter den gamle to-nivå-modellen (topbar = seksjoner, sidebar =
 * underpunkter). Prinsippet er snudd: **sidebaren ER navigasjonen, topbaren er
 * bare et sted-du-er-skilt.**
 *
 * Denne fila er fortsatt ÉN datastruktur som styrer alt: sidebar-radene,
 * dropdown-menyene og breadcrumben i topbaren. Flytt en rad for å flytte en
 * side. Legg til et objekt for en ny destinasjon.
 *
 * ⚠️ Rollegating her er KOSMETIKK. Den ekte sperren er RLS + adminProcedure
 * server-side; dette skjuler bare rader brukeren likevel ville fått 403 på.
 */

/** Et underpunkt i en destinasjons dropdown. */
export type NavChild = {
  label: string;
  href: string;
  icon?: LucideIcon;
  /** Arver destinasjonens roller når den ikke er satt. */
  roles?: OrgRole[];
  /** Nøkkel for uleste-telling (kun Innboks i dag). */
  countKey?: 'kunder' | 'intern' | 'endwise';
};

export type NavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string;
  roles: OrgRole[];
  /**
   * ⚠️ Ingen nav-rader bruker denne per 20.08.2026 — eier ba om at «New» ble
   * fjernet fra sidebaren. Fem rader hadde den, og et merke som står på fem av
   * elleve rader i månedsvis slutter å bety «nytt» og begynner å bety
   * «bakgrunn». Feltet står igjen fordi mekanismen er riktig når noe FAKTISK er
   * nytt — men da skal det tas av igjen.
   *
   * ⛔ Det eneste «Ny» i sidebaren nå er helpdesk-merket, og den er datadrevet:
   * den forsvinner av seg selv når du har lest artiklene.
   */
  isNew?: boolean;
  /** Viser dropdown-pil og folder ut underpunktene. */
  children?: NavChild[];
  /**
   * Bærer et tall på nav-raden.
   *
   * `unread`   — uleste meldinger (Innboks). Rød sirkel, hvitt siffer.
   * `helpdesk` — uleste hjelpeartikler. Samme røde sirkel — Mikael 24.08.2026.
   *   «Ny»-tekstbadgen er et annet merke (nye flater/artikler), ikke telleren.
   */
  badge?: 'unread' | 'helpdesk';
  countKey?: 'kunder' | 'intern' | 'endwise';
};

const DRIFT: OrgRole[] = ['dealer_staff', 'dealer_admin', 'endwise_admin', 'endwise_support'];
const ADMIN_OF_TENANT: OrgRole[] = ['dealer_admin', 'endwise_admin'];
const ENDWISE: OrgRole[] = ['endwise_admin', 'endwise_support'];
const ENDWISE_STYRING: OrgRole[] = ['endwise_admin'];

/* ══ KONTEKSTER ═══════════════════════════════════════════════════════════
 * Tre kontekster i ÉN sidebar — dropdownen i toppen bytter hvilken som vises.
 * Ikke tre sidebars, og ikke tre apper.
 */
export type ContextKey = 'forhandler' | 'mekaniker' | 'lager' | 'butikk' | 'endwise';

export type AppContext = {
  key: ContextKey;
  label: string;
  hint: string;
  icon: LucideIcon;
  /** Hvem får LOV til å velge konteksten. */
  roles: OrgRole[];
  /** Krever at brukeren har en mekaniker-profil (mechanics.userId). */
  requiresMechanic?: boolean;
  /** F5-28: vises kun når dev-mode er PÅ (tre server-side betingelser). */
  requiresDevMode?: boolean;
  landing: string;
};

export const CONTEXTS: AppContext[] = [
  {
    key: 'forhandler',
    label: 'Forhandler',
    hint: 'Drift, jobber og kunder',
    icon: Building2,
    roles: DRIFT,
    landing: '/dashboard',
  },
  {
    key: 'mekaniker',
    label: 'Mekaniker',
    hint: 'Min dag og jobbene mine',
    icon: HardHat,
    roles: DRIFT,
    requiresMechanic: true,
    landing: '/min-dag',
  },
  {
    /**
     * F5-31 — LAGER. Den første konteksten som bare ER der: ingen
     * `requiresDevMode`, ingen `requiresMechanic`, ingen modul-gate.
     * Lager er KJERNE — et verksted uten deloversikt er et verksted uten drift.
     */
    key: 'lager',
    label: 'Lager',
    hint: 'Deler, beholdning og inn og ut',
    icon: Package,
    roles: DRIFT,
    landing: '/lager',
  },
  {
    // F5-28 — BEVISST TOM. Eier designer flaten selv; den skal ikke gjettes.
    // Konteksten står i dropdownen som en plassholder man kan gå inn i og se
    // hva som mangler, ikke som en kulisse som later som den virker.
    key: 'butikk',
    label: 'Butikk',
    hint: 'Ikke designet ennå',
    icon: Store,
    roles: ENDWISE,
    requiresDevMode: true,
    landing: '/butikk',
  },
  {
    key: 'endwise',
    label: 'Endwise',
    hint: 'Forhandlere, innboks, flagg',
    icon: ShieldCheck,
    roles: ENDWISE,
    landing: '/endwise',
  },
];

/* ══ FORHANDLER — hoveddestinasjonene, topp→bunn ═════════════════════════ */
export const FORHANDLER_NAV: NavItem[] = [
  {
    key: 'dashboard',
    // Omdøpt 06.08.2026: «Dashboard» er et ord fra vår verden, ikke fra
    // verkstedet. «Verkstedet» er stedet eieren faktisk tenker på.
    label: 'Verkstedet',
    icon: LayoutDashboard,
    href: '/dashboard',
    roles: DRIFT,
  },
  {
    key: 'innboks',
    label: 'Innboks',
    icon: Inbox,
    href: '/innboks',
    roles: DRIFT,
    badge: 'unread',
    // ⚠️ Ingen `children` lenger (05.08.2026). Kanalfiltrene Kunder/Intern/
    // Endwise bor nå i innboksens EGEN sidebar inne i innholdsområdet — se
    // `innboks/_inbox-sidebar.tsx`. Å ha dem begge steder ville betydd to
    // kontroller for samme filter, og de ville gått ut av synk.
  },
  {
    key: 'saker',
    label: 'Jobber',
    icon: ClipboardList,
    href: '/saker',
    roles: DRIFT,
    children: [
      { label: 'Liste', href: '/saker', icon: ClipboardList },
      { label: 'Kalender', href: '/saker?visning=kalender', icon: CalendarDays },
    ],
  },
  {
    key: 'kunder',
    label: 'Kunder',
    icon: Users,
    href: '/kunder',
    roles: DRIFT,
    children: [
      { label: 'Kunder', href: '/kunder', icon: Users },
      { label: 'Kjøretøy', href: '/kjoretoy', icon: Car },
    ],
  },
  {
    key: 'samarbeid',
    label: 'Samarbeid',
    icon: Handshake,
    href: '/samarbeid',
    roles: ADMIN_OF_TENANT,
  },
  {
    key: 'analyse',
    // Flattenet 25.08.2026: destinasjonen heter Rapporter. `/analyse?visning=direkte`
    // virker fortsatt, men «Direkte data» er ikke en egen nav-rad.
    label: 'Rapporter',
    icon: ChartLine,
    href: '/analyse',
    roles: ADMIN_OF_TENANT,
  },
  /**
   * AI-verktøy er PARKERT 25.08.2026 — ikke i FORHANDLER_NAV.
   * Ruter står: `/ai-innsikt`, `/ai-verktoy/diagnose|nettside|nettbutikk`.
   * Diagnose under Jobber kommer senere. Se PARKED_LABEL.
   */
  {
    /**
     * 25.08.2026 (Mikael): egen destinasjon — ikke Innstillinger-fane og ikke
     * flyout. Verkstednorsk: label **Ansatte**, over Hjelp.
     * Endwise-admin beholder label Team på `/endwise/team`.
     *
     * Ruter som allerede fantes: `/innstillinger/team` (F1-10/F5-19),
     * `/innstillinger/tjenestekatalog` (F2-05/F5-04), kompetanse og kapasitet.
     * `/mekanikere` lever videre fra Team-siden, men er ikke sidebar-barn.
     */
    key: 'team',
    label: 'Ansatte',
    icon: Users,
    href: '/innstillinger/team',
    roles: DRIFT,
    children: [
      { label: 'Team', href: '/innstillinger/team', icon: UserCog, roles: ADMIN_OF_TENANT },
      /**
       * F2-05/F5-04 — forhandlerens EGEN katalog (hva KUNDEN betaler).
       * Tjenester & priser i Innstillinger er det motsatte pengeforholdet
       * (hva forhandleren betaler oss).
       *
       * Ingen `roles`: raden arver destinasjonens DRIFT, så en dealer_staff
       * ser katalogen — han må kunne svare på hva en EU-kontroll koster.
       * Skriving er `adminProcedure` server-side.
       */
      { label: 'Prisliste', href: '/innstillinger/tjenestekatalog', icon: Wrench },
      { label: 'Kompetanse', href: '/mekanikere/kompetanse', icon: Tags, roles: ADMIN_OF_TENANT },
      { label: 'Timeplan', href: '/mekanikere/kapasitet', icon: Gauge, roles: ADMIN_OF_TENANT },
    ],
  },
  {
    key: 'helpdesk',
    label: 'Hjelp',
    icon: LifeBuoy,
    href: '/support',
    roles: DRIFT,
    badge: 'helpdesk',
  },
];

/**
 * Forankret nederst — visuelt skilt fra hovednavet.
 *
 * 25.08.2026 (Mikael): Innstillinger er en destinasjon til profil, ikke en
 * flyout. Pille-fanene på `/innstillinger` eier undersidene (Abonnement,
 * Varsler, …) for forhandler. Breadcrumb/⌘K navngir dem via SETTINGS_CRUMB.
 */
export const SETTINGS_NAV: NavItem = {
  key: 'settings',
  label: 'Innstillinger',
  icon: Settings,
  href: '/innstillinger/profil',
  roles: DRIFT,
};

/* ══ MEKANIKER-konteksten ════════════════════════════════════════════════ */
export const MEKANIKER_NAV: NavItem[] = [
  { key: 'min-dag', label: 'Min dag', icon: CalendarDays, href: '/min-dag', roles: DRIFT },
  {
    key: 'arbeidsflate',
    label: 'Jobbene mine',
    icon: Wrench,
    href: '/mekaniker/arbeid',
    roles: DRIFT,
  },
  {
    key: 'min-kompetanse',
    label: 'Kompetanse',
    icon: Tags,
    href: '/min-dag/kompetanse',
    roles: DRIFT,
  },
  {
    key: 'min-timeplan',
    label: 'Timeplan',
    icon: CalendarDays,
    href: '/min-dag/timeplan',
    roles: DRIFT,
  },
  // F7-06 — samme «Meg» som i bunnmenyen. Mekanikervisningen har ÉN layout;
  // en admin som ser den i sidebaren skal se de samme punktene.
  { key: 'min-meg', label: 'Meg', icon: CircleUser, href: '/min-dag/meg', roles: DRIFT },
];

/* ══ LAGER-konteksten (F5-31) ════════════════════════════════════════════
 * ⛔ Ingen handel her. Ser du en «Selg»-knapp, er den i feil fane: kostpris
 * hører hjemme i Lager, utsalgspris i Butikk.
 */
export const LAGER_NAV: NavItem[] = [
  { key: 'lager-oversikt', label: 'Oversikt', icon: LayoutDashboard, href: '/lager', roles: DRIFT },
  { key: 'lager-deler', label: 'Deler', icon: Package, href: '/lager/deler', roles: DRIFT },
  {
    key: 'lager-lokasjoner',
    label: 'Plass',
    icon: MapPin,
    href: '/lager/lokasjoner',
    roles: DRIFT,
  },
  {
    key: 'lager-bevegelser',
    label: 'Inn og ut',
    icon: ArrowLeftRight,
    href: '/lager/bevegelser',
    roles: DRIFT,
  },
];

/* ══ ENDWISE-ADMIN ═══════════════════════════════════════════════════════
 * Var bevisst tom (eiers beslutning 04.08.2026). Fikk sitt første punkt
 * 07.08.2026: **Forhandlere** — det er herfra en tenant opprettes, og uten
 * den flaten finnes det ingen lovlig vei inn i dev-mode.
 *
 * Fortsatt en clean slate for alt annet: dagens /admin-sider (eksterne
 * kostnader, moduler, flagg, logg) er urørt og bevisst ikke dratt inn.
 */
export const ENDWISE_NAV: NavItem[] = [
  {
    key: 'endwise-oversikt',
    label: 'Oversikt',
    icon: LayoutDashboard,
    href: '/endwise',
    roles: ENDWISE,
  },
  /**
   * F5-11 — forhandler↔Endwise. Ikke en Admin-tab, ikke butikk.
   * Lista er `listPlatformSupport` (dealer_admin på tvers av tenants).
   */
  {
    key: 'endwise-innboks',
    label: 'Innboks',
    icon: Inbox,
    href: '/endwise/innboks',
    roles: ENDWISE,
    badge: 'unread',
    countKey: 'endwise',
  },
  {
    key: 'endwise-team',
    label: 'Team',
    icon: Users,
    href: '/endwise/team',
    roles: ENDWISE_STYRING,
  },
  {
    key: 'endwise-forhandlere',
    label: 'Forhandlere',
    icon: Building2,
    href: '/endwise/forhandlere',
    roles: ENDWISE,
  },
  /**
   * F5-23 — hjelpeartiklene skrives HER, ikke i forhandlerens Innstillinger.
   * En publisert artikkel dukker opp i sidebaren hos alle 250 verksteder; det
   * er en plattformhandling, som dev-mode-bryteren ved siden av.
   */
  {
    key: 'endwise-helpdesk',
    label: 'Hjelpeartikler',
    icon: LifeBuoy,
    href: '/endwise/helpdesk',
    roles: ENDWISE_STYRING,
  },
  /**
   * F0-04 — release-toggles, IKKE entitlements. Kjøpte moduler skrives av
   * Stripe og bor ikke her. Plattformhandling: kun endwise_admin.
   */
  {
    key: 'endwise-flagg',
    label: 'Flagg',
    icon: Flag,
    href: '/endwise/flagg',
    roles: ENDWISE_STYRING,
  },
];

/**
 * Settings i Endwise-admin-konteksten. Går til Min profil — uten
 * forhandler-faner (Abonnement, Tjenester & priser, …). Dev-mode lever
 * videre på `/endwise/innstillinger` (oversiktskortet), ikke i sidebaren.
 */
export const ENDWISE_SETTINGS_NAV: NavItem = {
  key: 'endwise-settings',
  label: 'Innstillinger',
  icon: Settings,
  href: '/innstillinger/profil',
  roles: ENDWISE,
};

/* ══ Oppslag ═════════════════════════════════════════════════════════════ */

/**
 * Kontekstene en bruker skal SE. Merk to ting:
 *
 *  · `requiresMechanic` filtrerer ikke lenger bort mekaniker-konteksten — den
 *    markeres `disabled` i stedet (F5-29). Å la valget forsvinne uten et ord
 *    var grunnen til at eier «ikke fant mekanikerdelen»: den var der hele
 *    tiden, men uten dør. Nå står døra der, låst, med skiltet på.
 *  · `requiresDevMode` filtrerer derimot HELT bort. Butikk-konteksten er ikke
 *    noe en forhandler skal vite finnes.
 *
 * ⚠️ Begge deler er kosmetikk. Serveren håndhever uansett.
 */
export function contextsForRole(
  role: OrgRole | null,
  isMechanic: boolean,
  devMode = false,
): (AppContext & { disabled?: boolean; disabledHint?: string })[] {
  if (!role) return [];
  return CONTEXTS.filter((c) => c.roles.includes(role) && (!c.requiresDevMode || devMode)).map(
    (c) =>
      c.requiresMechanic && !isMechanic
        ? { ...c, disabled: true, disabledHint: 'Krever mekaniker-profil' }
        : c,
  );
}

export function navForContext(context: ContextKey): NavItem[] {
  if (context === 'mekaniker') return MEKANIKER_NAV;
  if (context === 'endwise') return ENDWISE_NAV;
  if (context === 'lager') return LAGER_NAV;
  if (context === 'butikk') return [];
  return FORHANDLER_NAV;
}

/** Settings-blokka nederst — ulik per kontekst, `null` = ingen. */
export function settingsForContext(context: ContextKey): NavItem | null {
  if (context === 'forhandler') return SETTINGS_NAV;
  if (context === 'endwise') return ENDWISE_SETTINGS_NAV;
  return null;
}

/** Radene i en kontekst som rollen skal se. */
export function itemsForRole(items: NavItem[], role: OrgRole | null): NavItem[] {
  return items.filter((i) => role != null && i.roles.includes(role));
}

/** Underpunktene i en destinasjon som rollen skal se. */
export function childrenForRole(item: NavItem, role: OrgRole | null): NavChild[] {
  if (!item.children) return [];
  return item.children.filter((c) => !c.roles || (role != null && c.roles.includes(role)));
}

/** Stien uten query — nav-href-er kan bære `?kanal=`/`?visning=`. */
function pathOf(href: string): string {
  return href.split('?')[0];
}

/**
 * Dealer-Innstillinger-stier (pille-fanene). Ikke Team/tjenestekatalog —
 * de bor under Ansatte.
 */
const SETTINGS_STIER = [
  '/innstillinger/profil',
  '/innstillinger/varsler',
  '/innstillinger/tjenester',
  '/abonnement',
  '/integrasjoner',
  '/tjenester',
] as const;

export function erSettingsSti(pathname: string): boolean {
  if (pathname === '/innstillinger') return true;
  return SETTINGS_STIER.some((s) => pathname === s || pathname.startsWith(`${s}/`));
}

const SETTINGS_CRUMB: Record<string, string> = {
  '/innstillinger/profil': 'Profil',
  '/innstillinger/varsler': 'Varsler',
  '/innstillinger/tjenester': 'Tjenester & priser',
  '/abonnement': 'Abonnement',
  '/integrasjoner': 'Koblinger',
  '/tjenester': 'Tjenester & priser',
};

/** Er denne destinasjonen den aktive? */
export function isItemActive(item: NavItem, pathname: string): boolean {
  if (item.key === 'settings') return erSettingsSti(pathname);
  if (item.key === 'endwise-settings') {
    return (
      pathname === '/innstillinger' ||
      pathname === '/innstillinger/profil' ||
      pathname.startsWith('/innstillinger/profil/')
    );
  }
  const hrefs = [item.href, ...(item.children?.map((c) => c.href) ?? [])].map(pathOf);
  return hrefs.some((h) => {
    if (pathname === h) return true;
    // /endwise er oversikt — ikke prefix for /endwise/forhandlere.
    // /innstillinger er Innstillinger-huben — ikke prefix for Ansatte
    // (/innstillinger/team) etter at den ble egen destinasjon.
    if (h === '/endwise' || h === '/innstillinger') return false;
    return pathname.startsWith(`${h}/`);
  });
}

/**
 * Konteksten en sti hører til. Brukes ved direkte-navigasjon (bokmerke,
 * refresh) så sidebaren viser riktig kontekst uten at brukeren må velge på nytt.
 */
export function contextForPath(pathname: string): ContextKey {
  if (pathname.startsWith('/min-dag') || pathname.startsWith('/mekaniker/')) return 'mekaniker';
  if (pathname.startsWith('/endwise')) return 'endwise';
  if (pathname.startsWith('/lager')) return 'lager';
  if (pathname.startsWith('/butikk')) return 'butikk';
  return 'forhandler';
}

/** Rollens landingsside etter innlogging. */
export function landingForRole(role: OrgRole | null, isMechanic: boolean): string {
  // Samme «ren mekaniker»-regel som i (app)/layout.tsx: en admin som OGSÅ har
  // mekaniker-profil skal lande på sitt eget dashboard, ikke i mekanikerflaten.
  if (role === 'endwise_admin' || role === 'endwise_support') return '/endwise';
  const kunMekaniker = isMechanic && role !== 'dealer_admin';
  if (kunMekaniker) return '/min-dag';
  return '/dashboard';
}

/**
 * F5-13 — Breadcrumb: destinasjon › undervisning.
 * Dette er ALT topbaren viser nå. Returnerer tom liste for ukjente ruter, som
 * er riktigere enn å gjette et navn.
 */
export function breadcrumbFor(
  pathname: string,
  search: string,
  context: ContextKey,
): { label: string; href?: string }[] {
  if (pathname.startsWith('/endwise/verksted/')) {
    const rest = pathname.replace(/^\/endwise\/verksted\/[^/]+/, '') || '/dashboard';
    return breadcrumbFor(rest, search, 'forhandler');
  }
  const settings = settingsForContext(context);
  const all = [...navForContext(context), ...(settings ? [settings] : [])];
  const item = all.find((i) => isItemActive(i, pathname));
  if (!item) return PARKED_LABEL[pathname] ? [{ label: PARKED_LABEL[pathname] }] : [];

  const crumbs: { label: string; href?: string }[] = [{ label: item.label, href: item.href }];

  if (item.key === 'settings' || item.key === 'endwise-settings') {
    const extra = SETTINGS_CRUMB[pathname];
    if (extra && extra !== item.label) crumbs.push({ label: extra });
    return crumbs;
  }

  // Undervisning: match først på query (?kanal=/?visning=), så på sti. Et
  // underpunkt med query må matche BÅDE sti og query — ellers ville «Liste»
  // (uten query) alltid vunnet over «Kalender» på samme sti.
  const barn = item.children ?? [];
  const child =
    barn.find((c) => {
      const [cPath, cQuery] = c.href.split('?');
      if (!cQuery) return false;
      return pathname === cPath && search.includes(cQuery);
    }) ??
    barn.find((c) => {
      const [cPath, cQuery] = c.href.split('?');
      if (cQuery) return false;
      return pathname === cPath;
    }) ??
    barn.find((c) => {
      const [cPath, cQuery] = c.href.split('?');
      if (cQuery) return false;
      return pathname.startsWith(`${cPath}/`);
    });
  if (child && child.label !== item.label) crumbs.push({ label: child.label });

  return crumbs;
}

/**
 * Ruter som IKKE er i primær-navet, men som fortsatt finnes og skal ha et navn
 * i breadcrumben og i ⌘K. Eiers beslutning 04.08.2026: markedsrutene og
 * Endwise-admin-sidene parkeres — koden beholdes, navet forenkles.
 */
export const PARKED_LABEL: Record<string, string> = {
  '/marked/agent': 'Parkert · Framer-agent',
  '/marked/nyhetsbrev': 'Parkert · Nyhetsbrev',
  '/marked/kampanjer': 'Parkert · Kampanjer',
  '/marked/innhold': 'Parkert · Innhold',
  '/marked/live': 'Parkert · Live besøkende (flyttet til Rapporter)',
  '/admin': 'Parkert · Endwise-oversikt',
  '/admin/forhandlere': 'Parkert · Forhandlere',
  '/admin/moduler': 'Parkert · Moduler',
  '/admin/flagg': 'Parkert · Flagg',
  '/admin/logg': 'Parkert · Aktivitetslogg',
  '/bookinger': 'Jobber (gammel sti)',
  '/kalender': 'Jobber · Kalender (gammel sti)',
  '/mekanikere': 'Ansatte · Mekanikere',
  '/mekanikere/kompetanse': 'Ansatte · Kompetanse',
  '/mekanikere/kapasitet': 'Ansatte · Timeplan',
  '/tjenester': 'Tjenester & priser',
  '/innstillinger/profil': 'Innstillinger · Profil',
  '/innstillinger/varsler': 'Innstillinger · Varsler',
  '/innstillinger/tjenester': 'Innstillinger · Tjenester & priser',
  '/abonnement': 'Innstillinger · Abonnement',
  '/integrasjoner': 'Innstillinger · Koblinger',
  '/support': 'Hjelp',
  '/endwise/helpdesk': 'Endwise · Hjelpeartikler',
  '/endwise/innstillinger': 'Endwise · Dev-mode',
  '/innstillinger/tjenestekatalog': 'Ansatte · Prisliste',
  '/butikk': 'Butikk (ikke designet ennå)',
  '/lager/deler': 'Lager · Deler',
  '/lager/lokasjoner': 'Lager · Plass',
  '/lager/bevegelser': 'Lager · Inn og ut',
  '/min-dag/profil': 'Min dag · Profil (erstattet av «Meg»)',
  '/min-dag/varsler': 'Min dag · Varsler',
  '/ai-innsikt': 'Parkert · Innsikt',
  '/ai-verktoy/diagnose': 'Parkert · Diagnose',
  '/ai-verktoy/nettside': 'Parkert · Nettside',
  '/ai-verktoy/nettbutikk': 'Parkert · Nettbutikk',
};

/** Quick actions — bevel-knappene rett under divideren. */
export const QUICK_ACTIONS = [
  { label: 'Ny jobb', href: '/bookinger/ny', icon: FilePlus },
  { label: 'Ny melding', href: '/innboks?ny=1', icon: MessageSquarePlus },
  { label: 'Ny kunde', href: '/kunder?ny=1', icon: UserPlus },
] as const;
