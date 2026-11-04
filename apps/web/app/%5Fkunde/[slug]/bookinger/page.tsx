import { hentOffentligKunde } from '../../_lib/hent.ts';
import { KundeBookingerFlate } from '../../_lib/portal.tsx';
import { KundeSkall } from '../../_lib/skall.tsx';
import { UkjentSide } from '../../_lib/ukjent-side.tsx';

export default async function KundeBookinger({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await hentOffentligKunde(slug);
  if (!tenant) return <UkjentSide />;

  return (
    <KundeSkall tenant={tenant} tittel="Bookinger" undertekst="Mottatt · Under arbeid · Klar">
      <KundeBookingerFlate />
    </KundeSkall>
  );
}
