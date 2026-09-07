import type { Route } from 'next';
import Link from 'next/link';
import { TemaToggle } from '@/app/_lib/tema-toggle';
import { CTA_PRIMAR, CTA_SEKUNDAR, CTA_TERTIAER } from './cta';
import { DEMO_LENKE } from './demo';
import { CTA_PRIMAR_TEKST, FOOTER_LENKER, NAV_LENKER } from './innhold';

/** Offentlig merke: ink (`bg-fg`). På ink-footer: on-primary. */
export function Merke({
  storrelse = 22,
  tone = 'default',
}: {
  storrelse?: number;
  tone?: 'default' | 'on-ink';
}) {
  const flate = tone === 'on-ink' ? 'bg-[var(--ew-accent-fg)]' : 'bg-fg';
  const tekst = tone === 'on-ink' ? 'text-[var(--ew-accent-fg)]' : 'text-fg';
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        aria-hidden
        className={`shrink-0 ${flate}`}
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
      <span className={`font-[650] text-[15px] ${tekst}`}>Endwise</span>
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
 * Topp: logo + destinasjoner (myke piller) + tema + Logg inn + primær CTA.
 * Ikke sticky, ikke megameny.
 */
export function MarkedsNav() {
  return (
    <header className="flex items-center justify-between gap-4 py-6">
      <Link href={'/' as Route} className="shrink-0" aria-label="Endwise — forside">
        <Merke />
      </Link>
      <nav className="hidden items-center gap-2 text-[13px] text-fg md:flex" aria-label="Marked">
        {NAV_LENKER.map((l) =>
          l.href.startsWith('#') ? (
            <a key={l.href} href={l.href} className={`${CTA_TERTIAER} h-9 px-4 text-[13px]`}>
              {l.tekst}
            </a>
          ) : (
            <Link
              key={l.href}
              href={l.href as Route}
              className={`${CTA_TERTIAER} h-9 px-4 text-[13px]`}
            >
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
    <footer className="rounded-t-[24px] bg-[var(--ew-ink-utility)] text-[var(--ew-accent-fg)]">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-8 px-6 pt-10 pb-16 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Merke storrelse={18} tone="on-ink" />
          <nav
            className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-[var(--ew-fg-faint)]"
            aria-label="Juridisk"
          >
            {FOOTER_LENKER.map((l) => (
              <Link
                key={l.href}
                href={l.href as Route}
                className="underline-offset-2 hover:text-[var(--ew-accent-fg)] hover:underline"
              >
                {l.tekst}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
