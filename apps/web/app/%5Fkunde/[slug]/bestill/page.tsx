import { Seksjon } from '@endwise/ui';
import { hentOffentligKunde } from '../../_lib/hent.ts';
import { KommerSnart, KundeSkall } from '../../_lib/skall.tsx';
import { UkjentSide } from '../../_lib/ukjent-side.tsx';

export default async function KundeBestill({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await hentOffentligKunde(slug);
  if (!tenant) return <UkjentSide />;

  return (
    <KundeSkall tenant={tenant} tittel="Bestill time" undertekst={`Hos ${tenant.visningsnavn}`}>
      <Seksjon tittel="Velg tid">
        <p className="text-body text-fg-muted max-md:text-[16px]">
          Bestilling åpnes når verkstedet er klart. Du kan ringe eller sende e-post i mellomtiden.
        </p>
        <KommerSnart barn="Velg dag" forklaring="Timebestilling kommer i en senere fase." />
      </Seksjon>
    </KundeSkall>
  );
}
