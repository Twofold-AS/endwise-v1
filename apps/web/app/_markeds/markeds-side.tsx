import {
  BILDE_SLOTS,
  BUNN_CTA_TEKST,
  BUNN_CTA_TITTEL,
  H1,
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
          <h1 className="font-semibold text-[44px] text-fg leading-[1.05] tracking-[-0.03em] sm:text-[64px]">
            {H1}
          </h1>
          <p className="mt-5 max-w-[36em] text-[17px] text-fg-muted leading-relaxed sm:text-[19px]">
            {HERO_LINJE}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <PrimarCtaLenke />
            <LoggInnLenke />
          </div>
        </div>
        <div className="mx-auto mt-14 max-w-[1120px]">
          <ProduktRamme slot={BILDE_SLOTS.hero} prioritet />
        </div>
      </section>

      <section data-markeds-seksjon="lofter" className={`${KOLONNE} pb-20 md:pb-28`}>
        <ul className="grid gap-4 md:grid-cols-3">
          {LOFTER.map((kort) => (
            <li
              key={kort.tittel}
              className="flex flex-col gap-3 rounded-[14px] border border-border bg-surface p-7"
            >
              <h2 className="font-semibold text-[21px] text-fg tracking-tight">{kort.tittel}</h2>
              <p className="text-body text-fg-muted leading-relaxed">{kort.tekst}</p>
            </li>
          ))}
        </ul>
      </section>

      <section
        data-markeds-seksjon="produkt"
        className={`${KOLONNE} flex flex-col gap-20 pb-20 md:gap-28 md:pb-28`}
      >
        {PRODUKT.map((rad) => {
          const tekst = (
            <div className="flex max-w-[38ch] flex-col gap-3">
              <h2 className="font-semibold text-[28px] text-fg leading-tight tracking-tight sm:text-[32px]">
                {rad.tittel}
              </h2>
              <p className="text-[17px] text-fg-muted leading-relaxed">{rad.tekst}</p>
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

      <section data-markeds-seksjon="pris" className={`${KOLONNE} pb-16 md:pb-24`}>
        <div className="mx-auto mb-10 max-w-[36em] text-center">
          <h2 className="font-semibold text-[28px] text-fg tracking-tight sm:text-[32px]">Pris</h2>
          <p className="mt-3 text-body text-fg-muted">{PRIS_FOT}</p>
        </div>
        <ul className="grid gap-4 md:grid-cols-3">
          {PRIS_KORT.map((kort) => (
            <li
              key={kort.key}
              data-pris-nivaa={kort.key}
              data-pris-valgt={kort.valgt ? 'true' : 'false'}
              className={`flex flex-col rounded-[14px] border p-7 ${
                kort.valgt ? 'border-fg bg-surface-2' : 'border-border bg-surface'
              }`}
            >
              <p className="text-label text-fg">{kort.navn}</p>
              <p className="mt-4 font-semibold text-[36px] text-fg tracking-tight">
                {kort.pris}
                <span className="ml-1 font-normal text-[13px] text-fg-muted">kr/mnd</span>
              </p>
              <p className="text-[12px] text-fg-muted">eks. mva</p>
              <p className="mt-3 text-body text-fg-muted leading-relaxed">{kort.pitch}</p>
              <ul className="mt-5 flex flex-col gap-2">
                {kort.punkter.map((p) => (
                  <li key={p} className="text-[13px] text-fg leading-snug">
                    {p}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <PrimarCtaLenke tekst="Ta kontakt" />
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
        <div className="flex flex-col items-center gap-5 rounded-[16px] border border-border bg-surface px-6 py-16 text-center">
          <h2 className="font-semibold text-[28px] text-fg tracking-tight sm:text-[32px]">
            {BUNN_CTA_TITTEL}
          </h2>
          <p className="max-w-[36em] text-body text-fg-muted">{BUNN_CTA_TEKST}</p>
          <PrimarCtaLenke />
        </div>
      </section>

      <div className={KOLONNE}>
        <MarkedsFooter />
      </div>
    </main>
  );
}
