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
  ShoppingCart,
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
 * Sidebar-først navigasjon.
 * Erstatter den gamle to-nivå-modellen (topbar = seksjoner, sidebar =
 * underpunkter). Prinsippet er snudd: sidebaren er navigasjonen, topbaren er
 * bare et sted-du-er-skilt.
 * Denne fila er fortsatt ÉN datastruktur som styrer alt: sidebar-radene,
 * dropdown-menyene og breadcrumben i topbaren. Flytt en rad for å flytte en
 * side. Legg til et objekt for en ny destinasjon.
 * Rollegating her er kosmetikk. Den ekte sperren er RLS + adminProcedure
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
   * Ingen nav-rader bruker denne — eier ba om at «New» ble
   * fjernet fra sidebaren. Fem rader hadde den, og et merke som står på fem av
   * elleve rader i månedsvis slutter å bety «nytt» og begynner å bety
   * «bakgrunn». Feltet står igjen fordi mekanismen er riktig når noe faktisk er
   * nytt — men da skal det tas av igjen.
   * Det eneste «Ny» i sidebaren nå er helpdesk-merket, og den er datadrevet:
   * den forsvinner av seg selv når du har lest artiklene.
   */
  isNew?: boolean;
  /** Ikke lenger i sidebaren (Jonas 28.08). Piller bor på siden. */
  children?: NavChild[];
  /** Horisontale piller på destinasjonssiden. Ikke barn i sidebaren. */
  pills?: NavChild[];
  /** Visuell skillelinje over raden (Jonas-treet). */
  dividerBefore?: boolean;
  /** Butikk-raden skjules når shop-flagget er av. */
  requiresShopFlag?: boolean;
  /**
   * Bærer et tall på nav-raden.
   * `unread` — uleste meldinger (Innboks). Rød sirkel, hvitt siffer.
   * `helpdesk` — uleste hjelpeartikler. Samme røde sirkel — Mikael.
   * «Ny»-tekstbadgen er et annet merke (nye flater/artikler), ikke telleren.
   */
  badge?: 'unread' | 'helpdesk';
  countKey?: 'kunder' | 'intern' | 'endwise';
};

export type ShellKey = 'forhandler' | 'mekaniker' | 'endwise' | 'endwise_partner';

const DRIFT: OrgRole[] = ['dealer_staff', 'dealer_admin'];
const ENDWISE: OrgRole[] = ['endwise_admin', 'endwise_support'];
const ENDWISE_STYRING: OrgRole[] = ['endwise_admin'];

/*
 * Kontekster
 * Tre kontekster i ÉN sidebar — dropdownen i toppen bytter hvilken som vises.
 * Ikke tre sidebars, og ikke tre apper.
 */
export type ContextKey = 'forhandler' | 'mekaniker' | 'lager' | 'butikk' | 'endwise';

export type AppContext = {
  key: ContextKey;
  label: string;
  hint: string;
  icon: LucideIcon;
  /** Hvem får lov til å velge konteksten. */
  roles: OrgRole[];
  /** Krever at brukeren har en mekaniker-profil (mechanics.userId). */
  requiresMechanic?: boolean;
  /** Vises kun når dev-mode er PÅ (tre server-side betingelser). */
  requiresDevMode?: boolean;
  /** Vises kun når feature-flaget `shop` er PÅ for tenanten. */
  requiresShopFlag?: boolean;
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
     * Lager. Den første konteksten som bare er der: ingen
     * `requiresDevMode`, ingen `requiresMechanic`, ingen modul-gate.
     * Lager er kjerne — et verksted uten deloversikt er et verksted uten drift.
     */
    key: 'lager',
    label: 'Lager',
    hint: 'Deler, beholdning og inn og ut',
    icon: Package,
    roles: DRIFT,
    landing: '/lager',
  },
  {
    /**
     * Intern testbutikk. Synlig kun når flagget `shop` er på for
     * tenanten (tenant-overstyring). Ikke en selgbar modul. Ikke Medusa.
     */
    key: 'butikk',
    label: 'Butikk',
    hint: 'Katalog og kasse',
    icon: Store,
    roles: DRIFT,
    requiresShopFlag: true,
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

/*
 * Jonas IA 28.08 — fasit. Ett skall, ingen visningsvelger.
 * Piller på siden. Landing åpner første pille.
 * Prisliste under Ansatte. Hjelp = /support, ikke slideren.
 */
/*
 * AI-verktøy er parkert — ikke i FORHANDLER_NAV.
 * Ruter står: `/ai-innsikt`, `/ai-verktoy/diagnose|nettside|nettbutikk`.
 */
export const FORHANDLER_NAV: NavItem[] = [
  {
    key: 'dashboard',
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
  },
  {
    key: 'saker',
    label: 'Jobber',
    icon: ClipboardList,
    href: '/jobber',
    roles: DRIFT,
    pills: [
      { label: 'Liste', href: '/jobber', icon: ClipboardList },
      { label: 'Kalender', href: '/jobber?visning=kalender', icon: CalendarDays },
    ],
  },
  {
    key: 'kunder',
    label: 'Kunder',
    icon: Users,
    href: '/kunder',
    roles: DRIFT,
    pills: [
      { label: 'Kunder', href: '/kunder', icon: Users },
      { label: 'Kjøretøy', href: '/kjoretoy', icon: Car },
    ],
  },
  {
    key: 'lager',
    label: 'Lager',
    icon: Package,
    href: '/lager',
    roles: DRIFT,
    pills: [
      { label: 'Oversikt', href: '/lager', icon: LayoutDashboard },
      { label: 'Deler', href: '/lager/deler', icon: Package },
      { label: 'Plass', href: '/lager/lokasjoner', icon: MapPin },
      { label: 'Inn og ut', href: '/lager/bevegelser', icon: ArrowLeftRight },
    ],
  },
  {
    key: 'butikk',
    label: 'Butikk',
    icon: Store,
    href: '/butikk',
    roles: DRIFT,
    requiresShopFlag: true,
    pills: [
      { label: 'Katalog', href: '/butikk', icon: Package },
      { label: 'Handlekurv / kasse', href: '/butikk/kasse', icon: ShoppingCart },
    ],
  },
  {
    key: 'samarbeid',
    label: 'Samarbeid',
    icon: MessageSquarePlus,
    href: '/samarbeid',
    roles: DRIFT,
    dividerBefore: true,
  },
  {
    key: 'analyse',
    label: 'Rapporter',
    icon: ChartLine,
    href: '/rapporter',
    roles: DRIFT,
  },
  {
    key: 'team',
    label: 'Ansatte',
    icon: UserCog,
    href: '/innstillinger/team',
    roles: DRIFT,
    pills: [
      { label: 'Team', href: '/innstillinger/team', icon: UserCog },
      { label: 'Prisliste', href: '/prisliste', icon: Wrench },
      { label: 'Kompetanse', href: '/mekanikere/kompetanse', icon: Tags },
      { label: 'Timeplan', href: '/mekanikere/kapasitet', icon: Gauge },
    ],
  },
  {
    key: 'helpdesk',
    label: 'Hjelp',
    icon: LifeBuoy,
    href: '/support',
    roles: DRIFT,
    badge: 'helpdesk',
    dividerBefore: true,
  },
];

/**
 * Forankret nederst — visuelt skilt fra hovednavet.
 * (Mikael): Innstillinger er en destinasjon til profil, ikke en
 * flyout. Pille-fanene på `/innstillinger` eier undersidene (Abonnement,
 * Varsler, …) for forhandler. Breadcrumb/K navngir dem via SETTINGS_CRUMB.
 */
export const SETTINGS_NAV: NavItem = {
  key: 'settings',
  label: 'Innstillinger',
  icon: Settings,
  href: '/innstillinger/profil',
  roles: DRIFT,
};

/* Mekaniker-konteksten */
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
    key: 'lager',
    label: 'Lager',
    icon: Package,
    href: '/lager',
    roles: DRIFT,
    pills: [{ label: 'Oversikt', href: '/lager', icon: LayoutDashboard }],
  },
  {
    key: 'butikk',
    label: 'Butikk',
    icon: Store,
    href: '/butikk',
    roles: DRIFT,
    requiresShopFlag: true,
    pills: [{ label: 'Katalog', href: '/butikk', icon: Package }],
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
  {
    key: 'helpdesk',
    label: 'Hjelp',
    icon: LifeBuoy,
    href: '/support',
    roles: DRIFT,
    badge: 'helpdesk',
    dividerBefore: true,
  },
  { key: 'min-meg', label: 'Meg', icon: CircleUser, href: '/min-dag/meg', roles: DRIFT },
];

/*
 * Lager-konteksten (F5-31)
 * Ingen handel her. Ser du en «Selg»-knapp, er den i feil fane: kostpris
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

/*
 * Butikk-konteksten (F10-03)
 * Intern preview. Katalog leser lager. Ingen ekstra ia.
 */
export const BUTIKK_NAV: NavItem[] = [
  { key: 'butikk-katalog', label: 'Katalog', icon: Package, href: '/butikk', roles: DRIFT },
  {
    key: 'butikk-kasse',
    label: 'Handlekurv / kasse',
    icon: ShoppingCart,
    href: '/butikk/kasse',
    roles: DRIFT,
  },
];

/*
 * Endwise-admin
 * Var bevisst tom (eiers beslutning). Fikk sitt første punkt
 * Forhandlere — det er herfra en tenant opprettes, og uten
 * den flaten finnes det ingen lovlig vei inn i dev-mode.
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
    key: 'endwise-forhandlere',
    label: 'Forhandlere',
    icon: Building2,
    href: '/endwise/forhandlere',
    roles: ENDWISE,
  },
  {
    key: 'endwise-team',
    label: 'Team',
    icon: Users,
    href: '/endwise/team',
    roles: ENDWISE_STYRING,
  },
  /**
   * Hjelpeartiklene skrives her, ikke i forhandlerens Innstillinger.
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
   * Release-toggles, ikke entitlements. Kjøpte moduler skrives av
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

/* Oppslag */

/**
 * Kontekstene en bruker skal se. Merk to ting:
 * `requiresMechanic` filtrerer ikke lenger bort mekaniker-konteksten — den
 * markeres `disabled` i stedet (F5-29). Å la valget forsvinne uten et ord
 * var grunnen til at eier «ikke fant mekanikerdelen»: den var der hele
 * tiden, men uten dør. Nå står døra der, låst, med skiltet på.
 * `requiresDevMode` filtrerer derimot helt bort.
 * `requiresShopFlag` filtrerer Butikk bort når flagget er av. En
 * dealer_admin uten tenant-overstyring skal ikke se konteksten.
 * Begge deler er kosmetikk. Serveren håndhever uansett.
 */
export function contextsForRole(
  role: OrgRole | null,
  isMechanic: boolean,
  devMode = false,
  shopFlag = false,
): (AppContext & { disabled?: boolean; disabledHint?: string })[] {
  if (!role) return [];
  return CONTEXTS.filter(
    (c) =>
      c.roles.includes(role) &&
      (!c.requiresDevMode || devMode) &&
      (!c.requiresShopFlag || shopFlag),
  ).map((c) =>
    c.requiresMechanic && !isMechanic
      ? { ...c, disabled: true, disabledHint: 'Krever mekaniker-profil' }
      : c,
  );
}

export function shellForBruker(input: {
  role: OrgRole | null;
  jobFunction?: string | null;
  isMechanic?: boolean;
  erPlattform?: boolean;
}): ShellKey {
  if (input.erPlattform || input.role === 'endwise_admin' || input.role === 'endwise_support') {
    return input.role === 'endwise_support' ? 'endwise_partner' : 'endwise';
  }
  const kunMekaniker =
    input.role === 'dealer_staff' &&
    (Boolean(input.isMechanic) || input.jobFunction === 'mekaniker');
  return kunMekaniker ? 'mekaniker' : 'forhandler';
}

export function navForShell(shell: ShellKey): NavItem[] {
  if (shell === 'mekaniker') return MEKANIKER_NAV;
  if (shell === 'endwise' || shell === 'endwise_partner') return ENDWISE_NAV;
  return FORHANDLER_NAV;
}

export function navForContext(context: ContextKey): NavItem[] {
  if (context === 'mekaniker') return MEKANIKER_NAV;
  if (context === 'endwise') return ENDWISE_NAV;
  if (context === 'lager') return LAGER_NAV;
  if (context === 'butikk') return BUTIKK_NAV;
  return FORHANDLER_NAV;
}

export function erTillattMekanikerSti(pathname: string): boolean {
  if (pathname.startsWith('/min-dag')) return true;
  if (pathname.startsWith('/mekaniker/')) return true;
  if (pathname === '/lager') return true;
  if (pathname === '/butikk') return true;
  if (pathname === '/support' || pathname === '/hjelp') return true;
  return false;
}

/** Settings-blokka nederst — ulik per skall, `null` = ingen (mekaniker har Meg). */
export function settingsForShell(shell: ShellKey): NavItem | null {
  if (shell === 'forhandler') return SETTINGS_NAV;
  if (shell === 'endwise' || shell === 'endwise_partner') return ENDWISE_SETTINGS_NAV;
  return null;
}

/** Settings-blokka nederst — ulik per kontekst, `null` = ingen. */
export function settingsForContext(context: ContextKey): NavItem | null {
  if (context === 'forhandler') return SETTINGS_NAV;
  if (context === 'endwise') return ENDWISE_SETTINGS_NAV;
  return null;
}

/** Radene i en kontekst som rollen skal se. */
export function itemsForRole(
  items: NavItem[],
  role: OrgRole | null,
  shopEnabled = true,
): NavItem[] {
  return items.filter(
    (i) => role != null && i.roles.includes(role) && (!i.requiresShopFlag || shopEnabled),
  );
}

/** Underpunktene i en destinasjon som rollen skal se. */
export function childrenForRole(item: NavItem, role: OrgRole | null): NavChild[] {
  if (!item.children) return [];
  return item.children.filter((c) => !c.roles || (role != null && c.roles.includes(role)));
}

/** Stien uten query — nav-href-er kan bære `?kanal=`/`?visning=`. */
function pathOf(href: string): string {
  return href.split('?')[0] ?? href;
}

/**
 * Brukernavn intern sti. Navet peker på de norske URL-ene; de gamle
 * sidene lever videre som alias. Inspect-remap oversetter tilbake.
 */
export const STI_ALIAS: Readonly<Record<string, string>> = {
  '/jobber': '/saker',
  '/saker': '/jobber',
  '/rapporter': '/analyse',
  '/analyse': '/rapporter',
  '/hjelp': '/support',
  '/support': '/hjelp',
  '/verkstedet': '/dashboard',
  '/dashboard': '/verkstedet',
  '/prisliste': '/innstillinger/tjenestekatalog',
  '/innstillinger/tjenestekatalog': '/prisliste',
  '/forhandleren': '/organisasjon/forhandleren',
  '/organisasjon/forhandleren': '/forhandleren',
};

export function stierFor(href: string): string[] {
  const p = pathOf(href);
  const alias = STI_ALIAS[p];
  return alias && alias !== p ? [p, alias] : [p];
}

function pathTreffer(pathname: string, href: string): boolean {
  return stierFor(href).some((h) => {
    if (pathname === h) return true;
    if (h === '/endwise' || h === '/innstillinger') return false;
    return pathname.startsWith(`${h}/`);
  });
}

/**
 * Dealer-Innstillinger-stier (pille-fanene). Ikke Team/Prisliste —
 * de bor under Ansatte.
 */
const SETTINGS_STIER = [
  '/innstillinger/profil',
  '/innstillinger/varsler',
  '/innstillinger/tjenester',
  '/innstillinger/koblinger',
  '/innstillinger/integrasjoner',
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
  '/innstillinger/koblinger': 'Koblinger',
  '/innstillinger/integrasjoner': 'Koblinger',
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
  const hrefs = [
    item.href,
    ...(item.pills?.map((c) => c.href) ?? []),
    ...(item.children?.map((c) => c.href) ?? []),
  ];
  return hrefs.some((h) => pathTreffer(pathname, h));
}

/**
 * Konteksten en sti hører til. Brukes ved direkte-navigasjon (bokmerke,
 * refresh) så sidebaren viser riktig kontekst uten at brukeren må velge på nytt.
 */
export function contextForPath(pathname: string): ContextKey {
  if (pathname.startsWith('/min-dag') || pathname.startsWith('/mekaniker/')) return 'mekaniker';
  if (pathname.startsWith('/endwise')) return 'endwise';
  return 'forhandler';
}

/** Rollens landingsside etter innlogging. */
export function landingForRole(role: OrgRole | null, isMechanic: boolean): string {
  // Samme «ren mekaniker»-regel som i (app)/layout.tsx: en admin som ogsÅ har
  // mekaniker-profil skal lande på sitt eget dashboard, ikke i mekanikerflaten.
  if (role === 'endwise_admin' || role === 'endwise_support') return '/endwise';
  const kunMekaniker = isMechanic && role !== 'dealer_admin';
  if (kunMekaniker) return '/min-dag';
  return '/dashboard';
}

/**
 * Breadcrumb: destinasjon › undervisning.
 * Dette er alt topbaren viser nå. Returnerer tom liste for ukjente ruter, som
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
  // underpunkt med query må matche både sti og query — ellers ville «Oversikt»
  // (uten query) alltid vunnet over «Kalender» på samme sti.
  const barn = item.pills ?? item.children ?? [];
  const child =
    barn.find((c) => {
      const [cPath, cQuery] = c.href.split('?');
      if (!cQuery) return false;
      return stierFor(cPath ?? '').includes(pathname) && search.includes(cQuery);
    }) ??
    barn.find((c) => {
      const [cPath, cQuery] = c.href.split('?');
      if (cQuery) return false;
      return stierFor(cPath ?? '').includes(pathname);
    }) ??
    barn.find((c) => {
      const [cPath, cQuery] = c.href.split('?');
      if (cQuery) return false;
      return pathTreffer(pathname, cPath ?? '');
    });
  if (child && child.label !== item.label) crumbs.push({ label: child.label });

  return crumbs;
}

/**
 * Ruter som ikke er i primær-navet, men som fortsatt finnes og skal ha et navn
 * i breadcrumben og i K. Eiers beslutning: markedsrutene og
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
  '/hjelp': 'Hjelp',
  '/jobber': 'Jobber',
  '/rapporter': 'Rapporter',
  '/verkstedet': 'Verkstedet',
  '/ansatte': 'Ansatte',
  '/forhandleren': 'Forhandleren',
  '/organisasjon/forhandleren': 'Forhandleren',
  '/innstillinger/koblinger': 'Innstillinger · Koblinger',
  '/innstillinger/integrasjoner': 'Innstillinger · Koblinger',
  '/endwise/helpdesk': 'Endwise · Hjelpeartikler',
  '/endwise/innstillinger': 'Endwise · Dev-mode',
  '/innstillinger/tjenestekatalog': 'Ansatte · Prisliste',
  '/prisliste': 'Ansatte · Prisliste',
  '/butikk': 'Butikk · Katalog',
  '/butikk/kasse': 'Butikk · Handlekurv / kasse',
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
