import { KundeBestillFlate } from '../../_lib/bestill.tsx';
import { hentOffentligKunde } from '../../_lib/hent.ts';
import { KundeSkall } from '../../_lib/skall.tsx';
import { UkjentSide } from '../../_lib/ukjent-side.tsx';

export default async function KundeBestill({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await hentOffentligKunde(slug);
  if (!tenant) return <UkjentSide />;

  return (
    <KundeSkall tenant={tenant} tittel="Bestill time" undertekst={`Hos ${tenant.visningsnavn}`}>
      <KundeBestillFlate />
    </KundeSkall>
  );
}
