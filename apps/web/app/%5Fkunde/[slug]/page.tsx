import { Seksjon } from '@endwise/ui';
import { hentOffentligKunde } from '../_lib/hent.ts';
import { KundeHjemFlate } from '../_lib/hjem.tsx';
import { kundeErInnlogget } from '../_lib/sesjon.ts';
import { KundeKontakt, KundeMarkedsFlate, KundeSkall } from '../_lib/skall.tsx';
import { UkjentSide } from '../_lib/ukjent-side.tsx';

export default async function KundeHjem({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await hentOffentligKunde(slug);
  if (!tenant) return <UkjentSide />;

  const innlogget = await kundeErInnlogget();
  if (!innlogget) {
    return (
      <KundeSkall tenant={tenant}>
        <KundeMarkedsFlate tenant={tenant} />
      </KundeSkall>
    );
  }

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
    <KundeSkall tenant={tenant}>
      <KundeHjemFlate />
      <KundeKontakt tenant={tenant} />
    </KundeSkall>
  );
}
