import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Bug A+B — stale UI etter live events.
 *
 * Innboksen invaliderte bare på lista (`/innboks`) og i den åpne tråden, og
 * trådsiden rørte ikke `listThreads`. Pakkebytte skrev `tenant_modules` uten
 * SSE og uten bekreftelse i admin. Disse testene låser at oppfriskningen er
 * app-bred, og at admin får synlig «lagret».
 */
const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Bug A: innboks oppdateres live app-bredt', () => {
  it('LiveSync sitter i app-shellet og lytter uavhengig av hvilken side som er åpen', () => {
    const layout = les('../app/(app)/layout.tsx');
    expect(layout).toMatch(/LiveSync|live-sync/);
    expect(layout).toMatch(/LydProvider/);
  });

  it('SSE-klienten tar Last-Event-ID med ved reconnect', () => {
    const stream = les('../app/(app)/_lib/use-event-stream.ts');
    expect(stream).toMatch(/streamSseUrl|lastEventId/);
    expect(stream).toMatch(/LAST_EVENT_STORAGE_KEY|endwise\.stream\.lastEventId/);
  });

  it('DOMAIN_EVENTS inneholder message.created og tenant.modules.changed', () => {
    const live = les('../app/(app)/_lib/live-event.ts');
    expect(live).toMatch(/message\.created/);
    expect(live).toMatch(/tenant\.modules\.changed/);
    const stream = les('../app/(app)/_lib/use-event-stream.ts');
    expect(stream).toMatch(/LIVE_DOMAIN_EVENTS|live-event/);
  });

  it('LiveSync invaliderer tråder OG meldinger på message.created', () => {
    const sync = utenKommentarer(les('../app/(app)/_lib/live-sync.tsx'));
    expect(sync).toMatch(/listThreads/);
    expect(sync).toMatch(/listMessages/);
    expect(sync).toMatch(/listPlatformSupport/);
    expect(sync).toMatch(/liveFamiliesForEvent|inbox/);
  });

  it('inbound-lyd fyrer i LiveSync, ikke hos avsenderen', () => {
    const sync = utenKommentarer(les('../app/(app)/_lib/live-sync.tsx'));
    expect(sync).toMatch(/shouldPlayInboundSound|nyMelding/);
    const lyd = utenKommentarer(les('../app/(app)/_lib/lyd.tsx'));
    // LydProvider skal ikke lenger eie SSE-abonnementet alene — LiveSync gjør det
    // app-bredt og kan avspille ved poll-reserve. Avsender bruker fortsatt sendt().
    expect(lyd).toMatch(/sendt/);
    expect(lyd).toMatch(/nyMelding/);
  });
});

describe('Bug B: pakkebytte bekreftes og oppfrisker forhandleren', () => {
  it('Lagre pakke viser success — ikke bare et stille badge-bytte', () => {
    const forhandlere = utenKommentarer(les('../app/(app)/endwise/forhandlere/page.tsx'));
    const kjopte = utenKommentarer(les('../app/(app)/endwise/_kjopte-moduler.tsx'));
    expect(forhandlere).toMatch(/successText=["']Lagret["']/);
    expect(kjopte).toMatch(/successText=["']Lagret["']/);
    expect(forhandlere).toMatch(/Pakken er lagret/);
    expect(kjopte).toMatch(/Pakken er lagret/);
  });

  it('LiveSync invaliderer billing og session.me ved tenant.modules.changed', () => {
    const sync = utenKommentarer(les('../app/(app)/_lib/live-sync.tsx'));
    expect(sync).toMatch(/billing\.katalog|katalog/);
    expect(sync).toMatch(/session\.me/);
    expect(sync).toMatch(/entitlements/);
  });

  it('LiveSync invaliderer helpdesk ved window-focus — ingen egen helpdesk-SSE', () => {
    const sync = utenKommentarer(les('../app/(app)/_lib/live-sync.tsx'));
    const live = les('../app/(app)/_lib/live-event.ts');
    expect(sync).toMatch(/helpdesk\.list/);
    expect(sync).toMatch(/helpdesk\.ulesteAntall/);
    expect(sync).toMatch(/addEventListener\('focus'/);
    expect(live).not.toMatch(/helpdesk/);
  });

  it('Oppsett-lenke vises bare for aktive tillegg — ikke etter nedgradering', () => {
    const side = utenKommentarer(les('../app/(app)/integrasjoner/_innhold.tsx'));
    expect(side).toMatch(/post\.aktiv/);
    expect(side).not.toMatch(/const oppsett = post\.har \? OPPSETT/);
  });
});
