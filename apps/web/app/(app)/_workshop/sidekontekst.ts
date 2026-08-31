import { breadcrumbFor, type ContextKey } from '../_shell/nav';

/**
 * Kort norsk merkelapp workshop-agenten får på hvert tur.
 * Pathname + tittel + merkelapp — slik at den vet hvor brukeren står.
 */
const MERKELAPP: Array<{ test: (path: string) => boolean; label: string }> = [
  {
    test: (p) =>
      p.startsWith('/jobber') ||
      p.startsWith('/saker') ||
      p.startsWith('/kalender') ||
      p.startsWith('/bookinger'),
    label: 'Timeplan',
  },
  { test: (p) => p.startsWith('/innboks'), label: 'Innboks' },
  { test: (p) => p.startsWith('/kunder') || p.startsWith('/kjoretoy'), label: 'Kunder' },
  {
    test: (p) =>
      p.startsWith('/organisasjon') ||
      p.startsWith('/ansatte') ||
      p.startsWith('/mekanikere') ||
      p.startsWith('/forhandleren'),
    label: 'Organisasjon',
  },
  {
    test: (p) =>
      p.startsWith('/dine-jobber') || p.startsWith('/min-dag') || p.startsWith('/mekaniker'),
    label: 'Jobber',
  },
  { test: (p) => p === '/dashboard' || p.startsWith('/verkstedet'), label: 'Verkstedet' },
  { test: (p) => p.startsWith('/innstillinger'), label: 'Innstillinger' },
  { test: (p) => p.startsWith('/lager'), label: 'Lager' },
  { test: (p) => p.startsWith('/butikk'), label: 'Butikk' },
  { test: (p) => p.startsWith('/bot'), label: 'Bot' },
  { test: (p) => p.startsWith('/endwise'), label: 'Endwise' },
  { test: (p) => p.startsWith('/support') || p.startsWith('/hjelp'), label: 'Hjelp' },
];

export type Sidekontekst = {
  pathname: string;
  tittel: string;
  merkelapp: string;
};

export function sidekontekst(
  pathname: string,
  search = '',
  context: ContextKey = 'forhandler',
): Sidekontekst {
  const crumbs = breadcrumbFor(pathname, search, context);
  const tittel = crumbs.map((c) => c.label).join(' › ') || 'Endwise';
  const merkelapp = MERKELAPP.find((m) => m.test(pathname))?.label ?? crumbs[0]?.label ?? 'Appen';
  return { pathname, tittel, merkelapp };
}
