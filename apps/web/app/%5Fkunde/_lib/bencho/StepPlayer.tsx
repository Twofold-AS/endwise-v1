'use client';

/**
 * Bencho step-player — MIT.
 * Kilde: https://bencho.dev/?c=step-player&theme=light
 * Live-blokk: `ue` i bencho-katalogen (.spl-*).
 *
 * Tilpasset kundesiden (Mikael 5. nov 2026): INGEN auto-avspilling/pace og
 * ingen play-knapp — prikkene står stille og bytter kjøretøy først når man
 * trykker på dem (eller sveiper på kortet over). Slot-målene er Benchos:
 * 8px prikk, 36px aktiv pill, 8px gap, 520ms easeOutCubic.
 */
import { SPL_DOT, splBredde, splSlots } from './spl-matte.ts';
import './StepPlayer.css';
import './tokens.css';

export { splSlots } from './spl-matte.ts';

export function StepPlayer({
  antall,
  aktiv,
  onVelg,
}: {
  antall: number;
  aktiv: number;
  onVelg: (i: number) => void;
}) {
  if (antall < 2) return null;
  const slots = splSlots(antall, aktiv);
  return (
    <fieldset className="spl" aria-label={`Kjøretøy ${aktiv + 1} av ${antall}`}>
      <div className="spl-row">
        <div className="spl-slab" style={{ padding: 14, borderRadius: 18 }}>
          <div className="spl-track" style={{ width: splBredde(antall, aktiv), height: SPL_DOT }}>
            {slots.map((s, i) => (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: faste slots per posisjon
                key={i}
                type="button"
                className="spl-dot"
                aria-label={`Kjøretøy ${i + 1}`}
                aria-current={i === aktiv ? 'step' : undefined}
                onClick={() => onVelg(i)}
                style={{ left: s.x, width: s.w }}
              >
                <i className="spl-ink" style={{ opacity: i === aktiv ? 1 : 0 }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </fieldset>
  );
}
