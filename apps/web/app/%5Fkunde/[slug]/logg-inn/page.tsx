import { Seksjon } from '@endwise/ui';
import { hentOffentligKunde } from '../../_lib/hent.ts';
import { KundeSkall } from '../../_lib/skall.tsx';
import { UkjentSide } from '../../_lib/ukjent-side.tsx';
import { LoggInnSkjema } from './logg-inn-skjema.tsx';

export default async function KundeLoggInn({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await hentOffentligKunde(slug);
  if (!tenant) return <UkjentSide />;

  return (
    <KundeSkall tenant={tenant} tittel="Logg inn" undertekst={`Hos ${tenant.visningsnavn}`}>
      <Seksjon tittel="E-postkode">
        <LoggInnSkjema merke={tenant.visningsnavn} />
      </Seksjon>
    </KundeSkall>
  );
}
