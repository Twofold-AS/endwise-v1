import { KundeKvitteringerFlate } from '../../_lib/butikk.tsx';
import { hentOffentligKunde } from '../../_lib/hent.ts';
import { KundeSkall } from '../../_lib/skall.tsx';
import { UkjentSide } from '../../_lib/ukjent-side.tsx';

export default async function KundeKvitteringer({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await hentOffentligKunde(slug);
  if (!tenant) return <UkjentSide />;

  return (
    <KundeSkall tenant={tenant} tittel="Kvitteringer" undertekst="Dine kjøp">
      <KundeKvitteringerFlate />
    </KundeSkall>
  );
}
