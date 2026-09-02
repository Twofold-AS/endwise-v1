import { isVerkstedInspectPath, remapHrefTilInspect, verkstedSlugFromPath } from '../_lib/plattform';
import { INNBOKS_FILTERE, type InboxPart } from './inbox-del';
import {
  ENDWISE_NAV,
  isItemActive,
  itemsForRole,
  type NavChild,
  navForShell,
  type OrgRole,
  PARKED_LABEL,
  pillsForRole,
  settingsForShell,
  type ShellKey,
  stierFor,
} from './nav';
import { erDealerInnboks } from './seksjon-sti';

export type DestinasjonFane = {
  label: string;
  href: string;
  valgt: boolean;
  inboxPart?: InboxPart;
};

function pathOf(href: string): string {
  return href.split('?')[0] ?? href;
}

function queryOf(href: string): string {
  return href.split('?')[1] ?? '';
}

function velgPille(piller: NavChild[], pathname: string, search: string): string | undefined {
  return (
    piller.find((p) => {
      const q = queryOf(p.href);
      return q.length > 0 && stierFor(pathOf(p.href)).includes(pathname) && search.includes(q);
    })?.href ??
    piller.find((p) => queryOf(p.href) === '' && stierFor(pathOf(p.href)).includes(pathname))
      ?.href ??
    piller.find((p) => {
      if (queryOf(p.href)) return false;
      const h = pathOf(p.href);
      return pathname.startsWith(`${h}/`);
    })?.href ??
    piller[0]?.href
  );
}

/**
 * Top-bar 2 under Ronny — faner fra nav.ts.
 * Destinasjon uten barn: én valgt fane med sidens navn.
 */
export function destinasjonFaner(input: {
  pathname: string;
  search?: string;
  role: OrgRole | null;
  shell: ShellKey;
  shopEnabled?: boolean;
  inboxPart?: InboxPart;
}): DestinasjonFane[] {
  const search = input.search ?? '';
  let pathname = input.pathname;
  let inspectSlug: string | null = null;
  if (isVerkstedInspectPath(pathname)) {
    inspectSlug = verkstedSlugFromPath(pathname);
    pathname = pathname.replace(/^\/endwise\/verksted\/[^/]+/, '') || '/dashboard';
  }
  if (pathname.startsWith('/oppstart')) return [];

  const mapHref = (href: string) => (inspectSlug ? remapHrefTilInspect(href, inspectSlug) : href);

  if (erDealerInnboks(pathname)) {
    const part = input.inboxPart ?? 'alle';
    return INNBOKS_FILTERE.map((f) => ({
      label: f.label,
      href: mapHref('/innboks'),
      valgt: part === f.key,
      inboxPart: f.key,
    }));
  }

  if (
    !inspectSlug &&
    (input.shell === 'endwise' || input.shell === 'endwise_partner') &&
    pathname.startsWith('/endwise')
  ) {
    return itemsForRole(ENDWISE_NAV, input.role, input.shopEnabled ?? true).map((i) => ({
      label: i.label,
      href: i.href,
      valgt: isItemActive(i, pathname),
    }));
  }

  const settings = settingsForShell(input.shell);
  const alle = [...navForShell(input.shell), ...(settings ? [settings] : [])];
  const item = alle.find((i) => isItemActive(i, pathname));
  if (!item) {
    return [{ label: PARKED_LABEL[pathname] ?? 'Endwise', href: pathname, valgt: true }];
  }

  const piller = pillsForRole(item, input.role);
  if (piller.length === 0) {
    return [{ label: item.label, href: mapHref(item.href), valgt: true }];
  }

  const aktiv = velgPille(piller, pathname, search);
  return piller.map((p) => ({
    label: p.label,
    href: mapHref(p.href),
    valgt: p.href === aktiv,
  }));
}
