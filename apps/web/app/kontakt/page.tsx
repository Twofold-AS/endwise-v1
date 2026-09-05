import type { Metadata } from 'next';
import { DEMO_EPOST, DEMO_LENKE } from '../_markeds/demo';
import { PrimarCtaLenke } from '../_markeds/markeds-chrome';
import { OffentligSide } from '../_markeds/offentlig-side';

export const metadata: Metadata = {
  title: 'Kontakt · Endwise',
  description: 'Prøv Endwise eller skriv til oss.',
};

export default function KontaktPage() {
  return (
    <OffentligSide tittel="Kontakt">
      <p>Vil du se Endwise? Prøv Endwise, eller skriv til oss.</p>
      <p>
        <a className="text-fg underline underline-offset-2" href={DEMO_LENKE}>
          {DEMO_EPOST}
        </a>
      </p>
      <div className="pt-2">
        <PrimarCtaLenke />
      </div>
    </OffentligSide>
  );
}
