import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  filtrerInboxTrader,
  inboxSide,
  inboxSideEtikett,
  INNBOKS_CHIPS,
  INNBOKS_FILTERE,
  INNBOKS_SIDE_STORRELSE,
  sorterInboxTrader,
} from '../app/(app)/_shell/inbox-del.ts';
import { FORHANDLER_NAV } from '../app/(app)/_shell/nav.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Claude Design BIT 4 — Innboks / samtale', () => {
  it('chrome er urørt: Alle meldinger · Ny melding · Sortering · Slett', () => {
    const bar = utenKommentarer(les('../app/(app)/innboks/_top-bar2.tsx'));
    expect(bar).toMatch(/Alle meldinger/);
    expect(bar).toMatch(/Ny melding/);
    expect(bar).toMatch(/data-innboks-sortering/);
    expect(bar).toMatch(/data-innboks-slett/);
    expect(bar).toMatch(/Uleste først/);
    expect(bar).toMatch(/data-innboks-angre/);
    expect(bar).toMatch(/angreSkjul/);
    expect(FORHANDLER_NAV.find((i) => i.key === 'innboks')?.pills).toBeUndefined();
    const grupper = utenKommentarer(les('../app/(app)/_shell/inbox-filter.tsx'));
    expect(grupper).toMatch(/label: 'Kunder'/);
    expect(grupper).toMatch(/label: 'Internt'/);
    expect(grupper).toMatch(/label: 'Support'/);
    expect(INNBOKS_FILTERE.map((f) => f.label)).toEqual([
      'Alle chatter',
      'Kunder',
      'Intern',
      'Endwise',
    ]);
  });

  it('filter-chips er Alle · Kunder · Intern · Support · Løst i lista, ikke chrome', () => {
    expect(INNBOKS_CHIPS.map((c) => c.label)).toEqual([
      'Alle',
      'Kunder',
      'Intern',
      'Support',
      'Løst',
    ]);
    expect(INNBOKS_CHIPS.some((c) => c.key === 'lost' && c.label === 'Løst')).toBe(true);
    const chips = utenKommentarer(les('../app/(app)/innboks/_filter-chips.tsx'));
    expect(chips).toMatch(/data-innboks-filter-chips/);
    expect(chips).toMatch(/INNBOKS_CHIPS/);
    expect(chips).not.toMatch(/DestinasjonSeksjonBar/);
    const side = utenKommentarer(les('../app/(app)/innboks/_inbox-sidebar.tsx'));
    expect(side).toMatch(/InboxFilterChips/);
    expect(side).toMatch(/data-innboks-pager/);
    expect(side).toMatch(/data-innboks-ulest/);
    expect(side).toMatch(/sisteTekst/);
    const bar = utenKommentarer(les('../app/(app)/innboks/_top-bar2.tsx'));
    expect(bar).not.toMatch(/InboxFilterChips/);
  });

  it('Løst-filter er ærlig tomt; pager er 10; Uleste først sorterer unread', () => {
    expect(INNBOKS_SIDE_STORRELSE).toBe(10);
    const rader = [
      { id: 'a', kind: 'customer_dealer', lastMessageAt: '2026-09-10', unread: 0 },
      { id: 'b', kind: 'mechanic_dealer', lastMessageAt: '2026-09-11', unread: 2 },
      { id: 'c', kind: 'dealer_admin', lastMessageAt: '2026-09-12', unread: 1 },
    ];
    expect(filtrerInboxTrader(rader, 'lost', new Set())).toEqual([]);
    expect(filtrerInboxTrader(rader, 'customer_dealer', new Set()).map((t) => t.id)).toEqual(['a']);
    expect(filtrerInboxTrader(rader, 'alle', new Set(['b'])).map((t) => t.id)).toEqual(['a', 'c']);
    expect(sorterInboxTrader(rader, 'uleste').map((t) => t.id)).toEqual(['b', 'c', 'a']);
    expect(sorterInboxTrader(rader, 'eldste').map((t) => t.id)).toEqual(['a', 'b', 'c']);
    expect(inboxSide(rader, 0, 2).map((t) => t.id)).toEqual(['a', 'b']);
    expect(inboxSideEtikett(3, 0, 2)).toBe('Viser 1–2 av 3');
    expect(inboxSideEtikett(0, 0)).toBe('Ingen meldinger å vise.');
  });

  it('samtale beholder PromptInput og ærlig Fjern/Forlat/Løst', () => {
    const trad = utenKommentarer(les('../app/(app)/innboks/[id]/page.tsx'));
    expect(trad).toMatch(/PromptInput/);
    expect(trad).toMatch(/PromptInputTextarea/);
    expect(trad).toMatch(/TradHandlinger/);
    expect(trad).toMatch(/data-innboks-deltakere/);
    expect(trad).not.toMatch(/resolveThread|leaveThread|removeParticipant/);
    const handlinger = utenKommentarer(les('../app/(app)/innboks/_trad-handlinger.tsx'));
    expect(handlinger).toMatch(/InviterAnsatt/);
    expect(handlinger).toMatch(/forkThread|Inviter/);
    expect(handlinger).toMatch(/Fjern — ingen API/);
    expect(handlinger).toMatch(/Forlat — ingen API/);
    expect(handlinger).toMatch(/Løst — ingen API/);
    expect(handlinger).not.toMatch(/resolveThread|leaveThread|deleteThread/);
    const router = les('../../api/src/trpc/routers/messages.ts');
    expect(router).toMatch(/forkThread:/);
    expect(router).not.toMatch(/resolveThread:|leaveThread:|deleteThread:/);
    const modul = les('../../../packages/modules/src/messages/threads.ts');
    expect(modul).toMatch(/sisteTekst/);
    expect(modul).not.toMatch(/resolvedAt|leaveThread|deleteThread/);
  });
});
