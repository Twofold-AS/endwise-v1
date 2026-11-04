import { Seksjon } from '@endwise/ui';
import { hentOffentligKunde } from '../../_lib/hent.ts';
import { KundeSkall } from '../../_lib/skall.tsx';
import { UkjentSide } from '../../_lib/ukjent-side.tsx';
import { VelgSkjema } from './velg-skjema.tsx';

export default async function KundeVelg({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await hentOffentligKunde(slug);
  if (!tenant) return <UkjentSide />;

  return (
    <KundeSkall tenant={tenant} tittel="Hva vil du åpne?" undertekst="Privat eller Bedrift">
      <Seksjon tittel="Velg">
        <VelgSkjema />
      </Seksjon>
    </KundeSkall>
  );
}
