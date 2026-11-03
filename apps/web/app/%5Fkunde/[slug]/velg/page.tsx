import { ListeRad, Seksjon } from '@endwise/ui';
import { hentOffentligKunde } from '../../_lib/hent.ts';
import { KommerSnart, KundeSkall } from '../../_lib/skall.tsx';
import { UkjentSide } from '../../_lib/ukjent-side.tsx';

export default async function KundeVelg({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await hentOffentligKunde(slug);
  if (!tenant) return <UkjentSide />;

  return (
    <KundeSkall tenant={tenant} tittel="Hva vil du åpne?" undertekst="Privat eller Bedrift">
      <Seksjon tittel="Velg">
        <ListeRad tittel="Privat" undertekst="Bookinger, kjøretøy og profil" href="/min-side" />
        <div className="pt-2">
          <KommerSnart
            barn="Bedrift"
            forklaring="Bedrift åpnes når innlogging med tofaktor er klar."
          />
        </div>
      </Seksjon>
    </KundeSkall>
  );
}
