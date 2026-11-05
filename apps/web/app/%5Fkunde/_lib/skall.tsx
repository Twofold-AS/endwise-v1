import type { OffentligTenant } from '@endwise/modules/tenant-host/oppslag';
import { DeaktivertHandling, ListeRad, Seksjon, Side } from '@endwise/ui';
import type { ReactNode } from 'react';
import { AktivJobbKort } from './aktiv-jobb.tsx';
import { KundeDock } from './dock.tsx';
import { kundeErInnlogget } from './sesjon.ts';
import { KundeTopp } from './topp.tsx';

const FORBUDT_CTA = '#0066ff';

function aksent(farge: string | null): string | undefined {
  if (!farge) return undefined;
  if (farge.toLowerCase() === FORBUDT_CTA) return undefined;
  return farge;
}

function ForhandlerMerke({
  tenant,
  stor,
  farge,
}: {
  tenant: OffentligTenant;
  stor: boolean;
  farge?: string;
}) {
  const px = stor ? 48 : 32;
  return (
    <div className="mx-auto flex max-w-lg items-center gap-3 px-3">
      {tenant.logoUrl ? (
        // biome-ignore lint/performance/noImgElement: Blob-URL per forhandler, ukjent host
        <img
          src={tenant.logoUrl}
          alt=""
          width={px}
          height={px}
          className={`shrink-0 rounded-full object-cover ${stor ? 'size-12' : 'size-8'}`}
        />
      ) : (
        <span
          aria-hidden
          className={`flex shrink-0 items-center justify-center rounded-full bg-surface-2 font-[650] text-fg ${
            stor ? 'size-12 text-[20px]' : 'size-8 text-[14px]'
          }`}
        >
          {(tenant.visningsnavn.trim().slice(0, 1) || '·').toUpperCase()}
        </span>
      )}
      <p
        className="min-w-0 truncate text-title text-fg max-md:text-[18px] max-md:font-[650]"
        style={farge ? { color: farge } : undefined}
      >
        {tenant.visningsnavn}
      </p>
    </div>
  );
}

export async function KundeSkall({
  tenant,
  tittel,
  undertekst,
  children,
}: {
  tenant: OffentligTenant;
  tittel?: string;
  undertekst?: string;
  children: ReactNode;
}) {
  const innlogget = await kundeErInnlogget();
  const farge = aksent(tenant.aksentfarge);

  return (
    <div
      data-kunde-skall
      data-kunde-innlogget={innlogget ? '1' : '0'}
      className="min-h-screen bg-bg text-fg"
    >
      <header className="sticky top-0 z-60 border-b border-border bg-bg pt-[env(safe-area-inset-top)]">
        {innlogget ? (
          <KundeTopp navn={tenant.visningsnavn} logoUrl={tenant.logoUrl} farge={farge} />
        ) : (
          <div className="px-1 py-4">
            <ForhandlerMerke tenant={tenant} stor farge={farge} />
          </div>
        )}
      </header>
      {innlogget ? <AktivJobbKort /> : null}
      <div
        className={`mx-auto max-w-lg ${
          innlogget ? 'pb-[calc(6.5rem+env(safe-area-inset-bottom))]' : ''
        }`}
      >
        {tittel ? (
          <Side tittel={tittel} undertekst={undertekst}>
            {children}
          </Side>
        ) : (
          <div className="flex flex-col gap-4 max-md:px-4 max-md:py-4">{children}</div>
        )}
        {tenant.visLevertAv ? (
          <footer className="px-4 py-6 text-center text-meta text-fg-muted max-md:text-[13px]">
            Levert av Endwise
          </footer>
        ) : null}
      </div>
      {innlogget ? <KundeDock /> : null}
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

export function KundeMarkedsFlate({ tenant }: { tenant: OffentligTenant }) {
  return (
    <div data-kunde-marked className="flex flex-col gap-4">
      <Seksjon tittel={tenant.visningsnavn}>
        <p className="text-body text-fg-muted max-md:text-[16px]">
          Logg inn for å bestille time og se dine bookinger.
        </p>
        <a
          href="/logg-inn"
          className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-pill bg-fg px-4 text-label text-bg max-md:text-[16px]"
        >
          Logg inn
        </a>
      </Seksjon>
      <KundeKontakt tenant={tenant} />
    </div>
  );
}

export function KommerSnart({ barn, forklaring }: { barn: string; forklaring: string }) {
  return (
    <DeaktivertHandling forklaring={forklaring} variant="secondary" size="lg">
      {barn}
    </DeaktivertHandling>
  );
}
