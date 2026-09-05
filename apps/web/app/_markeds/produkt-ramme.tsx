import Image from 'next/image';
import type { BildeFormat, BildeSlot } from './innhold';

/**
 * Fast spor til et produktskudd. Radius 14px (Jonas: 12–16).
 * `kilde` satt → next/image fyller samme boks. Uten kilde → lys UI-plassholder.
 * Aspect er låst, så bytte av fil ikke flytter teksten under.
 */
const RAMME = 'relative overflow-hidden rounded-[14px] border border-border bg-surface';

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
          <span className="font-semibold text-[13px] text-fg">Min dag</span>
          <span className="text-[11px] text-fg-muted">I dag</span>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          {['EU-kontroll', 'Service', 'Dekkskift'].map((tittel) => (
            <div
              key={tittel}
              className="rounded-[10px] border border-border bg-surface px-3 py-2.5"
            >
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
    <div className="flex h-full flex-col bg-bg" aria-hidden>
      <p className="sr-only">Midlertidig plassholder for {merkelapp}.</p>
      <div className="flex h-8 items-center gap-1.5 border-border border-b bg-surface px-3">
        <span className="size-2 rounded-full bg-surface-2" />
        <span className="size-2 rounded-full bg-surface-2" />
        <span className="size-2 rounded-full bg-surface-2" />
        <span className="ml-3 h-2 w-20 rounded-pill bg-surface-2" />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[88px_1fr] md:grid-cols-[140px_1fr]">
        <div className="flex flex-col gap-2 border-border border-r bg-surface p-3">
          <div className="h-2 w-12 rounded-pill bg-surface-2" />
          <div className="h-2 w-16 rounded-pill bg-sidebar-active" />
          <div className="h-2 w-10 rounded-pill bg-surface-2" />
          <div className="mt-auto h-6 w-6 rounded-full bg-surface-2" />
        </div>
        <div className="flex flex-col gap-3 p-3 md:p-5">
          <div className="h-3 w-28 rounded-pill bg-surface-2" />
          <div className="grid flex-1 grid-cols-3 gap-2 md:grid-cols-5">
            {['09', '10', '11', '12', '13'].map((time) => (
              <div
                key={time}
                className="flex flex-col gap-2 rounded-[10px] border border-border bg-surface p-2"
              >
                <span className="text-[10px] text-fg-muted tabular-nums">{time}:00</span>
                <div className="h-8 rounded-md bg-surface-2" />
                <div className="h-5 rounded-md bg-sidebar-active" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
