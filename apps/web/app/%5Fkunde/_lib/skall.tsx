import type { OffentligTenant } from '@endwise/modules/tenant-host/oppslag';
import { DeaktivertHandling, ListeRad, Seksjon, Side } from '@endwise/ui';
import type { ReactNode } from 'react';

const FORBUDT_CTA = '#0066ff';

function aksent(farge: string | null): string | undefined {
  if (!farge) return undefined;
  if (farge.toLowerCase() === FORBUDT_CTA) return undefined;
  return farge;
}

export function KundeSkall({
  tenant,
  tittel,
  undertekst,
  children,
}: {
  tenant: OffentligTenant;
  tittel: string;
  undertekst?: string;
  children: ReactNode;
}) {
  const farge = aksent(tenant.aksentfarge);

  return (
    <div data-kunde-skall className="min-h-screen bg-bg text-fg">
      <header className="border-b border-border px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <p
            className="min-w-0 truncate text-title text-fg max-md:text-[18px] max-md:font-[650]"
            style={farge ? { color: farge } : undefined}
          >
            {tenant.visningsnavn}
          </p>
        </div>
        <nav
          aria-label="Kunde"
          className="mx-auto mt-3 flex max-w-lg flex-wrap gap-2 text-label max-md:text-[14px]"
        >
          <a href="/" className="inline-flex h-11 items-center rounded-full px-3 text-fg">
            Hjem
          </a>
          <a href="/bestill" className="inline-flex h-11 items-center rounded-full px-3 text-fg">
            Bestill
          </a>
          <a href="/min-side" className="inline-flex h-11 items-center rounded-full px-3 text-fg">
            Min side
          </a>
          <a href="/logg-inn" className="inline-flex h-11 items-center rounded-full px-3 text-fg">
            Logg inn
          </a>
        </nav>
      </header>
      <div className="mx-auto max-w-lg">
        <Side tittel={tittel} undertekst={undertekst}>
          {children}
        </Side>
      </div>
      {tenant.visLevertAv ? (
        <footer className="px-4 py-6 text-center text-meta text-fg-muted max-md:text-[13px]">
          Levert av Endwise
        </footer>
      ) : null}
    </div>
  );
}

export function KundeKontakt({ tenant }: { tenant: OffentligTenant }) {
  const rader = [
    tenant.telefon ? { tittel: 'Telefon', undertekst: tenant.telefon } : null,
    tenant.epost ? { tittel: 'E-post', undertekst: tenant.epost } : null,
    tenant.sted ? { tittel: 'Sted', undertekst: tenant.sted } : null,
  ].filter((x): x is { tittel: string; undertekst: string } => x !== null);

  if (rader.length === 0) return null;

  return (
    <Seksjon tittel="Kontakt">
      {rader.map((r) => (
        <ListeRad key={r.tittel} tittel={r.tittel} undertekst={r.undertekst} chevron={false} />
      ))}
    </Seksjon>
  );
}

export function KommerSnart({ barn, forklaring }: { barn: string; forklaring: string }) {
  return (
    <DeaktivertHandling forklaring={forklaring} variant="secondary" size="lg">
      {barn}
    </DeaktivertHandling>
  );
}
