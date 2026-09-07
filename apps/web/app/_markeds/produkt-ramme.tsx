import Image from 'next/image';
import type { BildeFormat, BildeSlot } from './innhold';

/**
 * Fast spor til et produktskudd. Kort 24px (Mobbin).
 * Uten kilde: 3-kolonne Endwise-mock. Aktiv rad = canvas-soft, ingen pip.
 */
const RAMME =
  'relative overflow-hidden rounded-[24px] border border-[var(--ew-divider-soft)] bg-bg';

export function ProduktRamme({
  slot,
  prioritet = false,
  className = '',
}: {
  slot: BildeSlot;
  prioritet?: boolean;
  className?: string;
}) {
  const telefon = slot.format === 'phone';
  return (
    <div
      data-bilde-slot={slot.id}
      data-bilde-format={slot.format}
      className={`${RAMME} ${telefon ? 'aspect-[9/19] max-w-[280px]' : 'aspect-[16/10] w-full'} ${className}`}
    >
      {slot.kilde ? (
        <Image
          src={slot.kilde}
          alt={slot.alt}
          fill
          placeholder="blur"
          priority={prioritet}
          sizes={telefon ? '(max-width: 768px) 60vw, 280px' : '(max-width: 768px) 100vw, 1120px'}
          className="object-cover object-top"
        />
      ) : (
        <Plassholder format={slot.format} merkelapp={slot.id} />
      )}
    </div>
  );
}

function Plassholder({ format, merkelapp }: { format: BildeFormat; merkelapp: string }) {
  if (format === 'phone') {
    return (
      <div className="flex h-full flex-col bg-bg px-3 pt-4 pb-3" aria-hidden>
        <p className="sr-only">Midlertidig plassholder for {merkelapp}.</p>
        <div className="mb-4 flex items-center justify-between px-1">
          <span className="font-[650] text-[13px] text-fg">Min dag</span>
          <span className="text-[11px] text-fg-muted">I dag</span>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          {['EU-kontroll', 'Service', 'Dekkskift'].map((tittel) => (
            <div key={tittel} className="px-1 py-2.5">
              <div className="h-2 w-16 rounded-pill bg-surface-2" />
              <p className="mt-2 text-[12px] text-fg">{tittel}</p>
              <div className="mt-2 h-1.5 w-24 rounded-pill bg-surface-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-bg" aria-hidden>
      <p className="sr-only">Midlertidig plassholder for {merkelapp}.</p>
      <div className="flex w-[28%] flex-col bg-sidebar p-3">
        <p className="mb-2 px-1 font-[450] text-[10px] text-sidebar-section uppercase">
          Verkstedet
        </p>
        {['Verkstedet', 'Innboks', 'Timeplan'].map((rad, i) => (
          <div
            key={rad}
            className={`relative flex items-center gap-2 rounded-pill px-2 py-1.5 ${
              i === 0 ? 'bg-sidebar-active' : ''
            }`}
          >
            <span className="text-[11px] text-fg">{rad}</span>
          </div>
        ))}
        <p className="mt-3 mb-2 px-1 font-[450] text-[10px] text-sidebar-section uppercase">
          Kunder
        </p>
        {['Kunder', 'Tjenester'].map((rad) => (
          <div key={rad} className="flex items-center rounded-pill px-2 py-1.5">
            <span className="text-[11px] text-fg-muted">{rad}</span>
          </div>
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <p className="font-[650] text-[13px] text-fg">Timeplan</p>
        <p className="mt-1 text-[11px] text-fg-muted">I dag · 4 jobber</p>
        <div className="mt-3 grid flex-1 grid-cols-3 gap-2 md:grid-cols-5">
          {['09', '10', '11', '12', '13'].map((time) => (
            <div key={time} className="flex flex-col gap-2 p-1">
              <span className="font-mono text-[10px] text-fg-muted tabular-nums">{time}:00</span>
              <div className="h-8 rounded-[16px] bg-surface-2" />
              <div className="h-5 rounded-[16px] bg-sidebar-active" />
            </div>
          ))}
        </div>
      </div>
      <div className="hidden w-[30%] flex-col bg-surface-2 p-4 md:flex">
        <p className="text-[12px] text-fg-muted">Jobb</p>
        <p className="mt-1 font-[650] text-[13px] text-fg">EU-kontroll · Yamaha</p>
        <p className="mt-3 text-[12px] text-fg-muted leading-relaxed">
          Mekaniker i spor 2. Kunden venter i innboksen.
        </p>
      </div>
    </div>
  );
}
