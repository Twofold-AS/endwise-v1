import { ListeRad, Seksjon } from '@endwise/ui';
import { hentOffentligKunde } from '../../_lib/hent.ts';
import { KundeSkall } from '../../_lib/skall.tsx';
import { UkjentSide } from '../../_lib/ukjent-side.tsx';

export default async function KundeMinSide({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await hentOffentligKunde(slug);
  if (!tenant) return <UkjentSide />;

  return (
    <KundeSkall tenant={tenant} tittel="Min side" undertekst="Logg inn for å se dine ting">
      <Seksjon tittel="Konto">
        <ListeRad tittel="Logg inn" undertekst="Få oversikt over bookinger" href="/logg-inn" />
      </Seksjon>
    </KundeSkall>
  );
}
