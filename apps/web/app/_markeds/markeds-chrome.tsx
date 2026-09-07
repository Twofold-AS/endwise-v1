import type { Route } from 'next';
import Link from 'next/link';
import { TemaToggle } from '@/app/_lib/tema-toggle';
import { CTA_PRIMAR, CTA_SEKUNDAR } from './cta';
import { DEMO_LENKE } from './demo';
import { CTA_PRIMAR_TEKST, FOOTER_LENKER, NAV_LENKER } from './innhold';

/** Offentlig merke: ink (`bg-fg`). Dealer bruker /logo/logo.svg uten denne masken. */
export function Merke({ storrelse = 22 }: { storrelse?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        aria-hidden
        className="shrink-0 bg-fg"
        style={{
          width: storrelse,
          height: Math.round((storrelse * 1152) / 928),
          maskImage: 'url(/logo/logo.svg)',
          maskSize: 'contain',
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskImage: 'url(/logo/logo.svg)',
          WebkitMaskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
        }}
      />
      <span className="font-semibold text-[15px] text-fg tracking-tight">Endwise</span>
    </span>
  );
}

export function PrimarCtaLenke({
  className = CTA_PRIMAR,
  tekst = CTA_PRIMAR_TEKST,
}: {
  className?: string;
  tekst?: string;
}) {
  return (
    <a
      href={DEMO_LENKE}
      className={className}
      data-markeds-cta={tekst === CTA_PRIMAR_TEKST ? 'prov-endwise' : 'ta-kontakt'}
    >
      {tekst}
    </a>
  );
}

export function LoggInnLenke({ className = CTA_SEKUNDAR }: { className?: string }) {
  return (
    <Link href={'/signin' as Route} className={className}>
      Logg inn
    </Link>
  );
}

/**
 * Topp: logo + destinasjoner + tema + Logg inn + primær CTA.
 * Ikke sticky, ikke megameny.
 */
export function MarkedsNav() {
  return (
    <header className="flex items-center justify-between gap-4 py-6">
      <Link href={'/' as Route} className="shrink-0" aria-label="Endwise — forside">
        <Merke />
      </Link>
      <nav
        className="hidden items-center gap-6 text-[13px] text-fg-muted md:flex"
        aria-label="Marked"
      >
        {NAV_LENKER.map((l) =>
          l.href.startsWith('#') ? (
            <a key={l.href} href={l.href} className="hover:text-fg">
              {l.tekst}
            </a>
          ) : (
            <Link key={l.href} href={l.href as Route} className="hover:text-fg">
              {l.tekst}
            </Link>
          ),
        )}
      </nav>
      <nav className="flex items-center gap-1 sm:gap-2" aria-label="Konto">
        <TemaToggle />
        <LoggInnLenke />
        <PrimarCtaLenke />
      </nav>
    </header>
  );
}

export function MarkedsFooter() {
  return (
    <footer className="flex flex-col gap-8 border-divide border-t pt-10 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Merke storrelse={18} />
        <nav
          className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-fg-muted"
          aria-label="Juridisk"
        >
          {FOOTER_LENKER.map((l) => (
            <Link
              key={l.href}
              href={l.href as Route}
              className="underline-offset-2 hover:text-fg hover:underline"
            >
              {l.tekst}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
