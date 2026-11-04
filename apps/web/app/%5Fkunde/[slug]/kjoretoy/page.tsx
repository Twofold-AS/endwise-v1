import { hentOffentligKunde } from '../../_lib/hent.ts';
import { KundeKjoretoyFlate } from '../../_lib/portal.tsx';
import { KundeSkall } from '../../_lib/skall.tsx';
import { UkjentSide } from '../../_lib/ukjent-side.tsx';

export default async function KundeKjoretoy({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await hentOffentligKunde(slug);
  if (!tenant) return <UkjentSide />;

  return (
    <KundeSkall tenant={tenant} tittel="Kjøretøy" undertekst="Servicehistorikk">
      <KundeKjoretoyFlate />
    </KundeSkall>
  );
}
