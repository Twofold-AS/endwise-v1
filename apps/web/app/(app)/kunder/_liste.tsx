'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PhoneSokFelt } from '../_shell/phone-sok-felt';
import {
  ClaudeAlphaRail,
  ClaudeInitialer,
  ClaudePager,
  ClaudeUndoToast,
} from '../_shell/claude-flate';
import { forbokstav, type NorskBokstav } from '../_shell/claude-tokens';
import { Feil, Laster } from './_delt';

const PER = 12;

export type KundeListeRad = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

export function KundeListe({
  kunder,
  laster,
  feil,
  sok,
  onSok,
}: {
  kunder: KundeListeRad[];
  laster: boolean;
  feil?: string;
  sok: string;
  onSok: (v: string) => void;
}) {
  const [bokstav, setBokstav] = useState<NorskBokstav>('#');
  const [side, setSide] = useState(0);
  const [skjulte, setSkjulte] = useState<ReadonlySet<string>>(() => new Set());
  const [slettet, setSlettet] = useState<KundeListeRad | null>(null);

  const filtrert = useMemo(() => {
    const q = sok.trim().toLowerCase();
    return kunder
      .filter((k) => !skjulte.has(k.id))
      .filter((k) => (bokstav === '#' ? true : forbokstav(k.name) === bokstav))
      .filter((k) => {
        if (!q) return true;
        return `${k.name} ${k.phone ?? ''} ${k.email ?? ''}`.toLowerCase().includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'nb'));
  }, [kunder, sok, bokstav, skjulte]);

  const sider = Math.max(1, Math.ceil(filtrert.length / PER));
  const sideNr = Math.min(side, sider - 1);
  const slice = filtrert.slice(sideNr * PER, sideNr * PER + PER);
  const fra = filtrert.length === 0 ? 0 : sideNr * PER + 1;
  const til = Math.min(filtrert.length, sideNr * PER + PER);

  function velgBokstav(l: NorskBokstav) {
    setBokstav(l);
    setSide(0);
  }

  return (
    <div data-kunder-claude className="relative flex min-h-[420px] flex-col gap-3 pr-8">
      <ClaudeAlphaRail aktiv={bokstav} onVelg={velgBokstav} />

      <div data-kunder-sok>
        <PhoneSokFelt
          value={sok}
          onChange={(e) => {
            onSok(e.target.value);
            setSide(0);
          }}
          placeholder="Navn, telefon, e-post eller reg.nr"
          aria-label="Søk i kunder"
        />
      </div>

      {slettet ? (
        <ClaudeUndoToast
          label={`${slettet.name} er skjult — sletting er ikke koblet til API ennå.`}
          onAngre={() => {
            setSkjulte((forrige) => {
              const neste = new Set(forrige);
              neste.delete(slettet.id);
              return neste;
            });
            setSlettet(null);
          }}
          onLukk={() => setSlettet(null)}
        />
      ) : null}

      {laster ? (
        <Laster />
      ) : feil ? (
        <Feil melding={feil} />
      ) : slice.length === 0 ? (
        <p className="py-10 text-center text-[15px] text-fg-muted">Ingen kunder matcher søket.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {slice.map((k) => (
            <li key={k.id} className="flex items-stretch gap-2">
              <Link
                href={`/kunder/${k.id}` as Route}
                data-kunde-rad={k.id}
                className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-[24px] border border-divide bg-card px-4 py-3 [touch-action:manipulation]"
              >
                <ClaudeInitialer navn={k.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px] font-[450] text-fg">{k.name}</span>
                  <span className="mt-0.5 block truncate text-[14px] text-fg-muted">
                    {k.phone || k.email || 'Ingen kontaktinfo'}
                  </span>
                </span>
              </Link>
              <button
                type="button"
                aria-label={`Skjul ${k.name}`}
                className="shrink-0 self-center text-[13px] text-fg-muted"
                onClick={() => {
                  setSkjulte((forrige) => new Set([...forrige, k.id]));
                  setSlettet(k);
                }}
              >
                Skjul
              </button>
            </li>
          ))}
        </ul>
      )}

      <ClaudePager
        label={`Viser ${fra}–${til} av ${filtrert.length}`}
        harForrige={sideNr > 0}
        harNeste={sideNr < sider - 1}
        onForrige={() => setSide((s) => Math.max(0, s - 1))}
        onNeste={() => setSide((s) => s + 1)}
      />
    </div>
  );
}
