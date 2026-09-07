import { CTA_PRIMAR, CTA_SEKUNDAR } from './cta';
import {
  BILDE_SLOTS,
  BUNN_CTA_TEKST,
  BUNN_CTA_TITTEL,
  H1,
  HERO_BEVIS,
  HERO_LINJE,
  LOFTER,
  PRIS_FOT,
  PRIS_KORT,
  PRODUKT,
  TILLIT,
} from './innhold';
import { LoggInnLenke, MarkedsFooter, MarkedsNav, PrimarCtaLenke } from './markeds-chrome';
import { ProduktRamme } from './produkt-ramme';

const KOLONNE = 'mx-auto w-full max-w-[1120px] px-6 md:px-8';

export function MarkedsSide() {
  return (
    <main className="min-h-screen bg-bg text-fg">
      <div className={KOLONNE}>
        <MarkedsNav />
      </div>

      <section data-markeds-seksjon="hero" className={`${KOLONNE} pt-10 pb-20 md:pt-16 md:pb-28`}>
        <div className="mx-auto flex max-w-[720px] flex-col items-center text-center">
          <h1 className="font-[650] text-[44px] text-fg leading-none sm:text-[64px]">{H1}</h1>
          <p className="mt-5 max-w-[36em] font-[300] text-[17px] text-fg-muted leading-[1.38] sm:text-[20px]">
            {HERO_LINJE}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <PrimarCtaLenke />
            <LoggInnLenke />
          </div>
          <p data-markeds-bevis className="mt-5 text-[13px] text-fg-faint">
            {HERO_BEVIS}
          </p>
        </div>
        <div className="mx-auto mt-14 max-w-[1120px]">
          <ProduktRamme slot={BILDE_SLOTS.hero} prioritet />
        </div>
      </section>

      <section data-markeds-seksjon="lofter" className={`${KOLONNE} pb-20 md:pb-28`}>
        <ul className="grid gap-3 md:grid-cols-3">
          {LOFTER.map((kort) => (
            <li key={kort.tittel} className="flex flex-col gap-3 rounded-[24px] bg-surface-2 p-7">
              <h2 className="font-[650] text-[21px] text-fg">{kort.tittel}</h2>
              <p className="text-body text-fg-muted">{kort.tekst}</p>
            </li>
          ))}
        </ul>
      </section>

      <section
        id="produkt"
        data-markeds-seksjon="produkt"
        className={`${KOLONNE} flex flex-col gap-20 pb-20 md:gap-28 md:pb-28`}
      >
        {PRODUKT.map((rad) => {
          const tekst = (
            <div className="flex max-w-[38ch] flex-col gap-3">
              <h2 className="font-[650] text-[28px] text-fg leading-[1.13] sm:text-[32px]">
                {rad.tittel}
              </h2>
              <p className="font-[450] text-[17px] text-fg-muted leading-[1.38]">{rad.tekst}</p>
            </div>
          );
          const bilde = (
            <ProduktRamme
              slot={BILDE_SLOTS[rad.bilde]}
              className={rad.id === 'phone' ? 'mx-auto md:mx-0' : ''}
            />
          );
          const venstre = rad.layout === 'bilde-venstre';
          return (
            <div
              key={rad.id}
              className={`flex flex-col items-center gap-10 md:justify-between ${
                venstre ? 'md:flex-row-reverse' : 'md:flex-row'
              }`}
            >
              {tekst}
              <div className={rad.id === 'phone' ? 'w-full md:w-auto' : 'min-w-0 flex-1'}>
                {bilde}
              </div>
            </div>
          );
        })}
      </section>

      <section id="pris" data-markeds-seksjon="pris" className={`${KOLONNE} pb-16 md:pb-24`}>
        <div className="mx-auto mb-10 max-w-[36em] text-center">
          <h2 className="font-[650] text-[28px] text-fg sm:text-[32px]">Pris</h2>
          <p className="mt-3 text-body text-fg-muted">{PRIS_FOT}</p>
        </div>
        <ul className="grid gap-3 md:grid-cols-3">
          {PRIS_KORT.map((kort) => (
            <li
              key={kort.key}
              data-pris-nivaa={kort.key}
              data-pris-valgt={kort.valgt ? 'true' : 'false'}
              className={`flex flex-col rounded-[24px] p-7 ${
                kort.valgt ? 'bg-surface-2' : 'border border-[var(--ew-divider-soft)] bg-bg'
              }`}
            >
              <div className="flex items-center gap-2">
                <p className="text-label text-fg">{kort.navn}</p>
                {kort.valgt ? (
                  <span
                    data-pris-popular
                    className="inline-flex h-5 items-center rounded-pill bg-[var(--ew-accent)] px-2 font-[600] text-[11px] text-[var(--ew-accent-fg)]"
                  >
                    Populær
                  </span>
                ) : null}
              </div>
              <p className="mt-4 font-[650] text-[36px] text-fg">
                {kort.pris}
                <span className="ml-1 font-[450] text-[13px] text-fg-muted">kr/mnd</span>
              </p>
              <p className="text-[12px] text-fg-muted">eks. mva</p>
              <p className="mt-3 text-body text-fg-muted">{kort.pitch}</p>
              <ul className="mt-5 flex flex-col gap-2">
                {kort.punkter.map((p) => (
                  <li key={p} className="text-[13px] text-fg leading-snug">
                    {p}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <PrimarCtaLenke
                  tekst="Ta kontakt"
                  className={kort.valgt ? CTA_PRIMAR : CTA_SEKUNDAR}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section data-markeds-seksjon="tillit" className={`${KOLONNE} pb-16 md:pb-24`}>
        <p className="mx-auto max-w-[40em] text-center text-[15px] text-fg-muted leading-relaxed">
          {TILLIT}
        </p>
      </section>

      <section data-markeds-seksjon="bunn-cta" className={`${KOLONNE} pb-8`}>
        <div className="flex flex-col items-center gap-5 rounded-[24px] bg-surface-2 px-6 py-16 text-center">
          <h2 className="font-[650] text-[28px] text-fg sm:text-[32px]">{BUNN_CTA_TITTEL}</h2>
          <p className="max-w-[36em] text-body text-fg-muted">{BUNN_CTA_TEKST}</p>
          <PrimarCtaLenke />
        </div>
      </section>

      <MarkedsFooter />
    </main>
  );
}
