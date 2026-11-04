import { hentOffentligKunde } from '../../_lib/hent.ts';
import { KundeHubFlate } from '../../_lib/portal.tsx';
import { KundeSkall } from '../../_lib/skall.tsx';
import { UkjentSide } from '../../_lib/ukjent-side.tsx';

export default async function KundeMinSide({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await hentOffentligKunde(slug);
  if (!tenant) return <UkjentSide />;

  return (
    <KundeSkall tenant={tenant} tittel="Min side" undertekst="Dine bookinger og kjøretøy">
      <KundeHubFlate />
    </KundeSkall>
  );
}
