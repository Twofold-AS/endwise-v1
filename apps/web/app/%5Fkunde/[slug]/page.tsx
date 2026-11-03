import { ListeRad, Seksjon } from '@endwise/ui';
import { hentOffentligKunde } from '../_lib/hent.ts';
import { KommerSnart, KundeKontakt, KundeSkall } from '../_lib/skall.tsx';
import { UkjentSide } from '../_lib/ukjent-side.tsx';

export default async function KundeHjem({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await hentOffentligKunde(slug);
  if (!tenant) return <UkjentSide />;

  if (!tenant.publisert) {
    return (
      <KundeSkall tenant={tenant} tittel={tenant.visningsnavn} undertekst="Kommer snart">
        <Seksjon tittel="Åpner snart">
          <p className="text-body text-fg-muted max-md:text-[16px]">
            Siden er ikke åpen ennå. Kom tilbake litt senere.
          </p>
        </Seksjon>
      </KundeSkall>
    );
  }

  return (
    <KundeSkall tenant={tenant} tittel={tenant.visningsnavn} undertekst="Velkommen">
      <Seksjon tittel="Hva vil du gjøre?">
        <ListeRad tittel="Bestill time" undertekst="Velg dag og tjeneste" href="/bestill" />
        <ListeRad tittel="Min side" undertekst="Bookinger og kjøretøy" href="/min-side" />
      </Seksjon>
      <KundeKontakt tenant={tenant} />
      <Seksjon tittel="Mer">
        <KommerSnart barn="Meldinger" forklaring="Meldinger kommer når kundeportalen er klar." />
      </Seksjon>
    </KundeSkall>
  );
}
