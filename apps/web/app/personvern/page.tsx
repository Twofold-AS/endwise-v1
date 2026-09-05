import type { Metadata } from 'next';
import { DEMO_EPOST } from '../_markeds/demo';
import { OffentligSide } from '../_markeds/offentlig-side';

export const metadata: Metadata = {
  title: 'Personvern · Endwise',
  description: 'Slik behandler Endwise personopplysninger.',
};

export default function PersonvernPage() {
  return (
    <OffentligSide tittel="Personvern">
      <p>
        Endwise drives av Twofold AS. Denne siden er den offentlige inngangen til personvernspørsmål
        — ikke en ferdig erklæring. Full personvernerklæring med underdatabehandlere, retensjon og
        de registrertes rettigheter publiseres før sluttkunder settes i produksjon.
      </p>
      <p>
        Kundedata for verkstedet ligger i EU (Postgres i Frankrike, app i Paris). Vi sender ikke
        kundens fritekst til en modell utenfor EU.
      </p>
      <p>
        Quick og Statens vegvesen (Autosys) brukes bare når forhandleren selv har slått
        integrasjonen på. Vi lager ikke en logo-vegg av det, og vi later ikke som alle verksted er
        koblet.
      </p>
      <p>
        Innsyn, retting og sletting: skriv til{' '}
        <a className="text-fg underline underline-offset-2" href={`mailto:${DEMO_EPOST}`}>
          {DEMO_EPOST}
        </a>
        .
      </p>
    </OffentligSide>
  );
}
