import {
  Activity,
  Blocks,
  CalendarCheck,
  CalendarDays,
  Car,
  CreditCard,
  Gauge,
  LayoutDashboard,
  type LucideIcon,
  Mail,
  Megaphone,
  MessageSquare,
  Newspaper,
  Plus,
  ShieldCheck,
  Sparkles,
  Tags,
  Users,
  Wrench,
} from '@endwise/ui';

export type OrgRole = 'customer' | 'dealer_staff' | 'dealer_admin' | 'endwise_admin';

export type NavLeaf = {
  icon: LucideIcon;
  label: string;
  href: string;
  isNew?: boolean;
  /** Hvem ser dette underpunktet? Standard = seksjonens roller. */
  roles?: OrgRole[];
};
export type Section = {
  key: string;
  label: string;
  icon: LucideIcon;
  roles: OrgRole[];
  isNew?: boolean;
  items: NavLeaf[];
};

const DRIFT: OrgRole[] = ['dealer_staff', 'dealer_admin', 'endwise_admin'];
const ADMIN_OF_TENANT: OrgRole[] = ['dealer_admin', 'endwise_admin'];
const ENDWISE: OrgRole[] = ['endwise_admin'];

/**
 * TO-NIVÅ NAVIGASJON med ROLLEGATING (F1-05). Topbar = seksjoner brukeren har
 * lov til å se; sidebar = underpunktene. UI-gating er KOSMETIKK — den ekte
 * sperren er adminProcedure/RLS server-side.
 *
 * Mekaniker (dealer_staff MED mekaniker-profil) er et spesialtilfelle: da vises
 * KUN «Min dag» (se `sectionsForRole`).
 */
export const SECTIONS: Section[] = [
  {
    key: 'forhandler',
    label: 'Forhandler',
    icon: LayoutDashboard,
    roles: DRIFT,
    items: [
      { icon: LayoutDashboard, label: 'Oversikt', href: '/dashboard' },
      { icon: CalendarCheck, label: 'Bookinger', href: '/bookinger' },
      { icon: Plus, label: 'Ny booking', href: '/bookinger/ny' },
      { icon: CalendarDays, label: 'Kalender', href: '/kalender' },
      { icon: Users, label: 'Kunder', href: '/kunder' },
      { icon: Car, label: 'Kjøretøy', href: '/kjoretoy' },
      { icon: Tags, label: 'Tjenester', href: '/tjenester' },
      // Abonnement er kun for forhandler-admin (ikke staff).
      {
        icon: CreditCard,
        label: 'Abonnement',
        href: '/abonnement',
        isNew: true,
        roles: ADMIN_OF_TENANT,
      },
    ],
  },
  {
    key: 'mekaniker',
    label: 'Mekaniker',
    icon: Wrench,
    roles: DRIFT,
    items: [
      { icon: Users, label: 'Mekanikere', href: '/mekanikere' },
      {
        icon: ShieldCheck,
        label: 'Kompetanse',
        href: '/mekanikere/kompetanse',
        roles: ADMIN_OF_TENANT,
      },
      { icon: Gauge, label: 'Kapasitet', href: '/mekanikere/kapasitet', roles: ADMIN_OF_TENANT },
      { icon: Wrench, label: 'Arbeidsflate', href: '/mekaniker/arbeid', isNew: true },
    ],
  },
  {
    key: 'marked',
    label: 'Marked',
    icon: Megaphone,
    roles: ADMIN_OF_TENANT,
    isNew: true,
    items: [
      { icon: Sparkles, label: 'Framer-agent', href: '/marked/agent', isNew: true },
      { icon: Megaphone, label: 'Live besøkende', href: '/marked/live', isNew: true },
      { icon: Mail, label: 'Nyhetsbrev', href: '/marked/nyhetsbrev', isNew: true },
      { icon: Megaphone, label: 'Kampanjer', href: '/marked/kampanjer' },
      { icon: Newspaper, label: 'Innhold', href: '/marked/innhold' },
    ],
  },
  {
    key: 'integrasjoner',
    label: 'Integrasjoner',
    icon: Blocks,
    roles: ADMIN_OF_TENANT,
    items: [
      { icon: Blocks, label: 'Oversikt', href: '/integrasjoner', isNew: true },
      { icon: Car, label: 'Vegvesen', href: '/integrasjoner/vegvesen' },
      { icon: CalendarCheck, label: 'Quick', href: '/integrasjoner/quick' },
      { icon: MessageSquare, label: 'Twilio (SMS)', href: '/integrasjoner/twilio' },
      { icon: Mail, label: 'Resend (e-post)', href: '/integrasjoner/resend' },
      { icon: Sparkles, label: 'AI-leverandører', href: '/integrasjoner/ai', isNew: true },
    ],
  },
  {
    key: 'admin',
    label: 'Admin',
    icon: ShieldCheck,
    roles: ENDWISE,
    items: [
      { icon: LayoutDashboard, label: 'Endwise-oversikt', href: '/admin', isNew: true },
      { icon: Users, label: 'Forhandlere', href: '/admin/forhandlere' },
      { icon: Tags, label: 'Moduler', href: '/admin/moduler' },
      { icon: ShieldCheck, label: 'Feature-flags', href: '/admin/flagg', isNew: true },
      { icon: Activity, label: 'Aktivitetslogg', href: '/admin/logg' },
    ],
  },
];

/** Egen «Min dag»-seksjon — vises KUN for mekanikere. */
export const MEKANIKER_DAG: Section = {
  key: 'min-dag',
  label: 'Min dag',
  icon: Wrench,
  roles: DRIFT,
  items: [
    { icon: CalendarCheck, label: 'Min dag', href: '/min-dag' },
    { icon: ShieldCheck, label: 'Min kompetanse', href: '/min-dag/kompetanse' },
  ],
};

/** Seksjonene en rolle (evt. mekaniker) skal se i topbaren. */
export function sectionsForRole(role: OrgRole | null, isMechanic: boolean): Section[] {
  if (isMechanic) return [MEKANIKER_DAG];
  if (!role) return [];
  return SECTIONS.filter((s) => s.roles.includes(role));
}

/** Underpunktene i en seksjon som rollen skal se. */
export function itemsForRole(section: Section, role: OrgRole | null): NavLeaf[] {
  return section.items.filter((i) => !i.roles || (role != null && i.roles.includes(role)));
}

/** Rollens landingsside etter innlogging. */
export function landingForRole(role: OrgRole | null, isMechanic: boolean): string {
  if (isMechanic) return '/min-dag';
  if (role === 'endwise_admin') return '/admin';
  return '/dashboard';
}

export function resolveActiveSectionKey(pathname: string): string {
  for (const s of [MEKANIKER_DAG, ...SECTIONS]) {
    if (s.items.some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))) {
      return s.key;
    }
  }
  return SECTIONS[0].key;
}
