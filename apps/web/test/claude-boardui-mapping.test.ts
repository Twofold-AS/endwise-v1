import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PULSE_DAG_FYLL_INK } from '../app/(app)/_shell/phone-home-pulse.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Claude-design + Board UI (samlet)', () => {
  it('dagsbuen bruker ink, ikke #0066ff', () => {
    expect(PULSE_DAG_FYLL_INK).toBe('#616161');
    const sirkel = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    expect(sirkel).toMatch(/PULSE_DAG_FYLL_INK/);
    expect(sirkel).not.toMatch(/PULSE_DAG_FYLL_BLA/);
  });

  it('ulest innboks er vekt 650 + soft tint, uten strek', () => {
    const side = utenKommentarer(les('../app/(app)/innboks/_inbox-sidebar.tsx'));
    expect(side).toMatch(/font-\[650\]/);
    expect(side).toMatch(/#f3f3f3/);
    expect(side).not.toMatch(/border-l-2/);
  });

  it('handlinger uten backend vises deaktivert med nøytral forklaring', () => {
    const handlinger = utenKommentarer(les('../app/(app)/innboks/_trad-handlinger.tsx'));
    expect(handlinger).toMatch(/DeaktivertHandling/);
    expect(handlinger).toMatch(/Fjern/);
    expect(handlinger).toMatch(/Forlat/);
    expect(handlinger).toMatch(/Marker som løst/);
    expect(handlinger).toMatch(/Kommer senere/);
    expect(handlinger).not.toMatch(/ingen API|INGEN_API/);

    const bestill = utenKommentarer(les('../app/(app)/lager/bestill/page.tsx'));
    expect(bestill).toMatch(/data-lager-bestill-skjema/);
    expect(bestill).toMatch(/DeaktivertHandling/);
    expect(bestill).toMatch(/Kommer senere/);
    expect(bestill).not.toMatch(/ingen API|INGEN_API/);

    const salg = utenKommentarer(les('../app/(app)/lager/_kjoretoy-salg.tsx'));
    expect(salg).toMatch(/data-kjoretoy-salg-skjema/);
    expect(salg).toMatch(/DeaktivertHandling/);
    expect(salg).not.toMatch(/ingen API|INGEN_API/);

    const jobb = utenKommentarer(les('../app/(app)/bookinger/[id]/page.tsx'));
    expect(jobb).toMatch(/Flyttet/);
    expect(jobb).toMatch(/Hentet/);
    expect(jobb).toMatch(/data-jobb-send-melding/);

    const kunde = utenKommentarer(les('../app/(app)/kunder/[id]/page.tsx'));
    expect(kunde).toMatch(/data-slett-kunde/);
    expect(kunde).toMatch(/AlertDialog/);
  });

  it('Board-fasade og Toaster er koblet', () => {
    const index = les('../../../packages/ui/src/index.ts');
    expect(index).toMatch(/DeaktivertHandling/);
    expect(index).toMatch(/FilterChips/);
    expect(index).toMatch(/StatusChip/);
    expect(index).toMatch(/TomFlate/);
    expect(index).toMatch(/FeltDato/);
    expect(index).toMatch(/Toaster/);
    expect(utenKommentarer(les('../app/providers.tsx'))).toMatch(/Toaster/);
    expect(utenKommentarer(les('../app/(app)/_shell/kommandopalett.tsx'))).toMatch(
      /CommandPalette/,
    );
    expect(utenKommentarer(les('../app/(app)/_shell/sortering-ark.tsx'))).toMatch(/Popover/);
    expect(utenKommentarer(les('../app/(app)/innstillinger/team/_detaljer.tsx'))).toMatch(
      /AlertDialog/,
    );
    expect(utenKommentarer(les('../app/(app)/endwise/forhandlere/page.tsx'))).toMatch(
      /ModalHeader/,
    );
    expect(utenKommentarer(les('../app/(app)/endwise/forhandlere/page.tsx'))).not.toMatch(
      /DialogTitle/,
    );
  });

  it('Endringer har Alle-filter; dato/tid bruker Board-kalender', () => {
    const endringer = utenKommentarer(les('../app/(app)/jobber/_endringer.tsx'));
    expect(endringer).toMatch(/label: 'Alle'/);
    expect(utenKommentarer(les('../app/(app)/bookinger/_starttid-velger.tsx'))).toMatch(
      /DateCalendar/,
    );
    expect(utenKommentarer(les('../app/(app)/_shell/timeplan-stripe.tsx'))).toMatch(/DateCalendar/);
    expect(utenKommentarer(les('../app/(app)/bookinger/_meld-endring.tsx'))).toMatch(/FeltDato/);
  });
});
