import { hentOffentligKunde } from '../../_lib/hent.ts';
import { KundeMineDataFlate } from '../../_lib/innsyn.tsx';
import { krevKundeInnlogging } from '../../_lib/sesjon.ts';
import { KundeSkall } from '../../_lib/skall.tsx';
import { UkjentSide } from '../../_lib/ukjent-side.tsx';

export default async function KundeMineData({ params }: { params: Promise<{ slug: string }> }) {
  await krevKundeInnlogging();
  const { slug } = await params;
  const tenant = await hentOffentligKunde(slug);
  if (!tenant) return <UkjentSide />;

  return (
    <KundeSkall tenant={tenant} tittel="Mine data" undertekst="Innsyn i egne rader">
      <KundeMineDataFlate />
    </KundeSkall>
  );
}
