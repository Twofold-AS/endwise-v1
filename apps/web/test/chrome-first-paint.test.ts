import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FORHANDLER_NAV, itemsForRole } from '../app/(app)/_shell/nav.ts';
import { CHROME_TRPC_PATHS, erChromeTrpcPath } from '../lib/trpc-chrome.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/**
 * Prod-hang etter PgBouncer :6432: første maling var ÉN httpBatch med
 * session.me + lager/kunder/jobber/stream. Sidebaren venter på hele
 * svaret fordi `itemsForRole(null)` er tom til session.me lander.
 */
describe('chrome-first first-paint', () => {
  it('chrome-stier er den lille mengden sidebaren faktisk trenger', () => {
    expect([...CHROME_TRPC_PATHS].sort()).toEqual(
      ['billing.subscription', 'forhandler.kort', 'helpdesk.ulesteAntall', 'session.me'].sort(),
    );
    expect(erChromeTrpcPath('session.me')).toBe(true);
    expect(erChromeTrpcPath('forhandler.kort')).toBe(true);
    expect(erChromeTrpcPath('helpdesk.ulesteAntall')).toBe(true);
    expect(erChromeTrpcPath('billing.subscription')).toBe(true);
    for (const side of [
      'bookings.list',
      'customers.list',
      'inventory.listParts',
      'inventory.listMovements',
      'services.list',
      'mechanics.list',
      'mechanics.oversikt',
      'messages.listThreads',
      'stream.since',
      'stream.head',
    ]) {
      expect(erChromeTrpcPath(side)).toBe(false);
    }
  });

  it('sidebar-nav er tom uten rolle — derfor må session.me ut av side-batchen', () => {
    expect(itemsForRole(FORHANDLER_NAV, null)).toEqual([]);
    expect(itemsForRole(FORHANDLER_NAV, 'dealer_admin').length).toBeGreaterThan(4);
  });

  it('providers splitter session.me (httpLink) fra chrome-batch og side-batch', () => {
    const providers = utenKommentarer(les('../app/providers.tsx'));
    expect(providers).toMatch(/splitLink/);
    expect(providers).toMatch(/erSessionMePath/);
    expect(providers).toMatch(/erChromeTrpcPath/);
    expect(providers).toMatch(/httpLink/);
    expect(providers).toMatch(/httpBatchLink/);
    expect(providers).toMatch(/credentials:\s*['"]include['"]/);
  });

  it('dashboard monterer ikke telefon-hjem og desktop-verksted samtidig', () => {
    const dash = utenKommentarer(les('../app/(app)/dashboard/page.tsx'));
    expect(dash).toMatch(/useMdViewport|flate === ['"]desktop['"]|flate === ['"]phone['"]/);
    expect(dash).not.toMatch(
      /dag \? <VerkstedetDag \/> : <PhoneHomeDealer \/>\s*<div className="hidden md:block">/,
    );
  });

  it('LiveSync venter med stream.* til session.me har svart', () => {
    const sync = utenKommentarer(les('../app/(app)/_lib/live-sync.tsx'));
    expect(sync).toMatch(/session\.me\.useQuery/);
    expect(sync).toMatch(/chromeKlar/);
    expect(sync).toMatch(/stream\.head\.useQuery\([\s\S]*enabled:\s*harSesjon && chromeKlar/);
    expect(sync).toMatch(
      /stream\.since\.useQuery\([\s\S]*enabled:\s*harSesjon && chromeKlar && cursor != null/,
    );
  });

  it('session.me har klient-frist slik layout ikke henger evig', () => {
    const rolle = utenKommentarer(les('../app/(app)/_lib/use-org-role.ts'));
    expect(rolle).toMatch(/SESSION_ME_CLIENT_TIMEOUT_MS/);
    expect(rolle).toMatch(/meFristUte/);
    expect(rolle).toMatch(/chromeFeilet/);
    const timeout = RolleTimeoutMs(rolle);
    expect(timeout).toBeGreaterThanOrEqual(5_000);
    expect(timeout).toBeLessThanOrEqual(10_000);
  });

  it('sidebar sier ifra når chrome feiler — ikke «Tom foreløpig» som ferdig tilstand', () => {
    const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
    expect(sidebar).toMatch(/chromeFeilet/);
    expect(sidebar).toMatch(/Kunne ikke laste menyen/);
  });
});

function RolleTimeoutMs(kilde: string): number {
  const m = kilde.match(/SESSION_ME_CLIENT_TIMEOUT_MS\s*=\s*(\d[\d_]*)/);
  if (!m?.[1]) return 0;
  return Number(m[1].replaceAll('_', ''));
}
