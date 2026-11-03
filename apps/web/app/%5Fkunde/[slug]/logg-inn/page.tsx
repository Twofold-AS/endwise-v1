import { BoardInput, Seksjon } from '@endwise/ui';
import { hentOffentligKunde } from '../../_lib/hent.ts';
import { KommerSnart, KundeSkall } from '../../_lib/skall.tsx';
import { UkjentSide } from '../../_lib/ukjent-side.tsx';

export default async function KundeLoggInn({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await hentOffentligKunde(slug);
  if (!tenant) return <UkjentSide />;

  return (
    <KundeSkall tenant={tenant} tittel="Logg inn" undertekst={`Hos ${tenant.visningsnavn}`}>
      <Seksjon tittel="E-postkode">
        <BoardInput label="E-post" type="email" autoComplete="email" isDisabled />
        <KommerSnart
          barn="Send kode"
          forklaring="Innlogging med kode kommer når felles innlogging er klar."
        />
      </Seksjon>
    </KundeSkall>
  );
}
