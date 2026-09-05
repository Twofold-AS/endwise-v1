import type { Metadata } from 'next';
import { DEMO_EPOST, DEMO_LENKE } from '../_markeds/demo';
import { BookDemoLenke } from '../_markeds/markeds-chrome';
import { OffentligSide } from '../_markeds/offentlig-side';

export const metadata: Metadata = {
  title: 'Kontakt · Endwise',
  description: 'Book en demo eller skriv til Endwise.',
};

export default function KontaktPage() {
  return (
    <OffentligSide tittel="Kontakt">
      <p>Vil du se Endwise? Book en demo, eller skriv til oss.</p>
      <p>
        <a className="text-fg underline underline-offset-2" href={DEMO_LENKE}>
          {DEMO_EPOST}
        </a>
      </p>
      <div className="pt-2">
        <BookDemoLenke />
      </div>
    </OffentligSide>
  );
}
