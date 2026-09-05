import type { Metadata } from 'next';
import { DEMO_EPOST } from '../_markeds/demo';
import { OffentligSide } from '../_markeds/offentlig-side';

export const metadata: Metadata = {
  title: 'Vilkår · Endwise',
  description: 'Vilkår for Endwise.',
};

export default function VilkarPage() {
  return (
    <OffentligSide tittel="Vilkår">
      <p>
        Endwise er et verkstedsystem for forhandlere. Abonnementet er fast pris per forhandler per
        måned, eks. mva, med ubegrenset antall brukere. Det finnes ingen setepris.
      </p>
      <p>
        Nivåene Start, Pro og Enterprise og prisen på dem står på forsiden og i priskatalogen. Det
        som vises der, er det vi selger. Tillegg avtales særskilt.
      </p>
      <p>
        En bindende avtale inngås når forhandleren får tilgang. Denne siden er ikke den avtalen.
        Spørsmål om vilkår: {DEMO_EPOST}.
      </p>
      <p>
        <a className="text-fg underline underline-offset-2" href={`mailto:${DEMO_EPOST}`}>
          {DEMO_EPOST}
        </a>
      </p>
    </OffentligSide>
  );
}
