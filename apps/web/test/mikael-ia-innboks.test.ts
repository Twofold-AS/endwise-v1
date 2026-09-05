import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { breadcrumbFor, FORHANDLER_NAV, MEKANIKER_NAV } from '../app/(app)/_shell/nav.ts';
import { erDealerInnboks, erInnboksSide, erInnboksTrad } from '../app/(app)/_shell/seksjon-sti.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Mikael IA 28.08 kveld — Innboks uten Oversikt', () => {
  it('ingen Oversikt-pille på innboks, filtre er ikke destinasjoner', () => {
    const innboks = FORHANDLER_NAV.find((i) => i.key === 'innboks');
    expect(innboks?.href).toBe('/innboks');
    expect(innboks?.pills).toBeUndefined();
    const filter = utenKommentarer(les('../app/(app)/_shell/inbox-del.ts'));
    expect(filter).toMatch(/label: 'Alle chatter'/);
    expect(filter).toMatch(/label: 'Kunder'/);
    expect(filter).toMatch(/label: 'Intern'/);
    expect(filter).toMatch(/label: 'Endwise'/);
    expect(filter).not.toMatch(/Oversikt/);
    expect(MEKANIKER_NAV.some((i) => i.label === 'Innboks')).toBe(false);
  });

  it('breadcrumb er Innboks, ikke Innboks › Oversikt', () => {
    expect(breadcrumbFor('/innboks', '', 'forhandler')).toEqual([
      { label: 'Innboks', href: '/innboks' },
    ]);
    expect(breadcrumbFor('/innboks/abc', '', 'forhandler')).toEqual([
      { label: 'Innboks', href: '/innboks' },
    ]);
  });

  it('Innboks-faner bor under Ronny, lista har compose + sortering', () => {
    const seksjon = utenKommentarer(les('../app/(app)/_shell/seksjon-bar.tsx'));
    const faner = utenKommentarer(les('../app/(app)/_shell/seksjon-faner.ts'));
    const side = utenKommentarer(les('../app/(app)/innboks/_inbox-sidebar.tsx'));
    const layout = utenKommentarer(les('../app/(app)/layout.tsx'));
    expect(layout).not.toMatch(/DestinasjonSeksjonBar/);
    expect(seksjon).toMatch(/export function DestinasjonSeksjonBar/);
    expect(seksjon).not.toMatch(/PhoneHScroll/);
    expect(faner).toMatch(/INNBOKS_FILTERE/);
    expect(side).toMatch(/aria-label="Innboks"/);
    expect(side).toMatch(/NyMeldingIkon/);
    expect(side).not.toMatch(/MessageSquarePlus/);
    expect(side).toMatch(/Nyeste/);
    expect(side).toMatch(/Eldste/);
    expect(side).toMatch(/max-md:hidden/);
    expect(side).not.toMatch(/Oversikt/);
  });

  it('erInnboksSide dekker dealer og inspect, filterbar er kun dealer', () => {
    expect(erInnboksSide('/innboks')).toBe(true);
    expect(erInnboksSide('/innboks/tråd-1')).toBe(true);
    expect(erInnboksSide('/endwise/verksted/acme/innboks')).toBe(true);
    expect(erInnboksSide('/endwise/innboks')).toBe(false);
    expect(erInnboksSide('/organisasjon')).toBe(false);
    expect(erDealerInnboks('/innboks')).toBe(true);
    expect(erDealerInnboks('/endwise/verksted/acme/innboks')).toBe(false);
    expect(erInnboksTrad('/innboks')).toBe(false);
    expect(erInnboksTrad('/innboks/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')).toBe(true);
    expect(erInnboksTrad('/innboks/abc')).toBe(true);
    const sti = utenKommentarer(les('../app/(app)/_shell/seksjon-sti.ts'));
    expect(sti).toMatch(/erDealerInnboks/);
    expect(sti).toMatch(/erInnboksTrad/);
  });
});

describe('Mikael 02.09 — tråd-chrome og fork', () => {
  it('dest-bar i åpen tråd er Tilbake + slett + Inviter ansatt', () => {
    const seksjon = utenKommentarer(les('../app/(app)/_shell/seksjon-bar.tsx'));
    const inviter = utenKommentarer(les('../app/(app)/innboks/_inviter-ansatt.tsx'));
    expect(seksjon).toMatch(/erInnboksTrad/);
    expect(seksjon).toMatch(/Tilbake/);
    expect(seksjon).toMatch(/InviterAnsatt|Inviter ansatt/);
    expect(seksjon).toMatch(/Trash2/);
    expect(seksjon).toMatch(/text-danger/);
    expect(seksjon).not.toMatch(/ChevronLeft|chevron-left/);
    expect(inviter).toMatch(/forkThread/);
    expect(inviter).toMatch(/team\.list/);
    expect(inviter).not.toMatch(/addParticipants/);
    expect(inviter).not.toMatch(/sendInboxMessage|RESEND/);
  });

  it('tråd-composer er samme PromptInput som Ronny', () => {
    const trad = utenKommentarer(les('../app/(app)/innboks/[id]/page.tsx'));
    expect(trad).toMatch(/PromptInput/);
    expect(trad).toMatch(/PromptInputTextarea/);
    expect(trad).toMatch(/PromptInputSubmit/);
    expect(trad).not.toMatch(/min-h-\[56px\]/);
    expect(trad).not.toMatch(/StatefulButton/);
  });

  it('messages.forkThread validerer tenant-ansatte og muterer ikke gammel tråd', () => {
    const router = les('../../api/src/trpc/routers/messages.ts');
    const modul = les('../../../packages/modules/src/messages/threads.ts');
    expect(router).toMatch(/forkThread:/);
    expect(router).toMatch(/organizationId, ctx.tenantId/);
    expect(router).toMatch(/inviteeIds/);
    expect(modul).toMatch(/async forkThread/);
    expect(modul).toMatch(/forkSystemMelding/);
    expect(modul).toMatch(/Gammel tråd og medlemsliste står urørt/);
  });
});

describe('Mikael IA — telefon vs desktop innboks', () => {
  const side = utenKommentarer(les('../app/(app)/innboks/_inbox-sidebar.tsx'));
  const samtale = utenKommentarer(les('../app/(app)/innboks/_ny-samtale.tsx'));
  const pane = utenKommentarer(les('../app/(app)/innboks/page.tsx'));
  const chrome = utenKommentarer(les('../app/(app)/innboks/_chrome.tsx'));
  const hoved = utenKommentarer(les('../app/(app)/innboks/_hovedflate.tsx'));

  it('én verktøylinje: Nyeste, Eldste, slett, ny chat og velg kort', () => {
    expect(side).toMatch(/NyMeldingIkon/);
    expect(side).toMatch(/Nyeste/);
    expect(side).toMatch(/Eldste/);
    expect(side).toMatch(/Trash2/);
    expect(side).toMatch(/velg kort|Velg kort/);
    expect(side).toMatch(/data-innboks-verktoy/);
    expect(side).toMatch(/min-h-11/);
    expect(side).toMatch(/z-20/);
    expect(side).toMatch(/aktivId \? 'max-md:hidden'/);
    expect(side).not.toMatch(/To linjer/);
  });

  it('Ny melding er ikon, compose åpner Kunde · Intern · Support — ingen Mekaniker', () => {
    expect(side).toMatch(/Ny melding/);
    expect(side).toMatch(/NyMeldingIkon/);
    expect(side).toMatch(/\/innboks\?ny=1/);
    expect(samtale).toMatch(/label: 'Kunde'/);
    expect(samtale).toMatch(/label: 'Intern'/);
    expect(samtale).toMatch(/label: 'Support'/);
    expect(samtale).not.toMatch(/Mekaniker/);
  });

  it('landing er alle chatter, desktop tomflate er postkasse', () => {
    expect(side).toMatch(/part === 'alle' \|\| t\.kind === part/);
    expect(side).toMatch(/listThreads/);
    expect(side).toMatch(/t\.unread/);
    expect(pane).toMatch(/Ingen valgte meldinger/);
    expect(pane).toMatch(/<Inbox /);
    expect(pane).toMatch(/Ny chat/);
    expect(pane).not.toMatch(/Oversikt/);
    expect(chrome).toMatch(/InboxHovedflate/);
    expect(chrome).toMatch(/InboxSidebar/);
    expect(chrome).toMatch(/DetaljerSlot/);
    expect(hoved).toMatch(/max-md:hidden/);
  });
});
