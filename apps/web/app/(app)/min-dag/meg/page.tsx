'use client';

import {
  Bell,
  LogOut,
  type LucideIcon,
  Mail,
  Moon,
  Phone,
  ShieldCheck,
  Sun,
  Switch,
  Zap,
} from '@endwise/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signOut, useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../../_shell/cards';
import { ProfilKort } from '../../_shell/profil-kort';
import { ToFaktorRad } from '../../_shell/to-faktor-rad';

/**
 * F7-06 — «MEG». Mekanikerens personlige fane, nederst i bunnmenyen.
 *
 * ⛔ **Dette er IKKE forhandlerens Settings.** Ingenting her gjelder verkstedet:
 * ingen abonnement, ingen team, ingen priser, ingen andre mekanikere. Alt er
 * mekaniker-scopet — `mechanic.myProfile` utleder mekanikeren fra
 * `mechanics.userId = ctx.userId`, aldri fra input, så det finnes ingen vei til
 * en kollegas profil herfra.
 *
 * ── Hvorfor to hurtigbrytere øverst ───────────────────────────────────────
 * Dette er en telefon i et verksted, ofte med hansker på. De to tingene som
 * faktisk byttes ofte — **tema** (sollys mot mørk hall) og **varsler av/på**
 * (pause, møte, fridag) — ligger derfor øverst som store brytere, ikke nede i
 * en innstillingsliste. Resten er ting man ser på én gang.
 *
 * Samme layout på maskin: mekanikervisningen har ingen egen desktop-variant, og
 * skal ikke få det. To varianter av samme skjerm er to skjermer å holde i synk.
 */

/** Lokale preferanser. Ingen backend ennå — F6-12 (Web Push) eier den delen. */
const LAGER_TEMA = 'endwise.tema';
const LAGER_VARSLER = 'endwise.varsler';

export default function MegPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const profil = trpc.mechanic.myProfile.useQuery();
  const m = profil.data;

  const [tema, setTema] = useState<'light' | 'dark'>('light');
  const [varsler, setVarsler] = useState(true);

  // Leses etter mount — server vet ikke hva nettleseren har valgt, og å gjette
  // gir hydrerings-mismatch.
  useEffect(() => {
    const naa = document.documentElement.dataset.theme;
    if (naa === 'light' || naa === 'dark') setTema(naa);
    setVarsler(localStorage.getItem(LAGER_VARSLER) !== 'av');
  }, []);

  function byttTema(mork: boolean) {
    const neste = mork ? 'dark' : 'light';
    document.documentElement.dataset.theme = neste;
    localStorage.setItem(LAGER_TEMA, neste);
    setTema(neste);
  }

  function byttVarsler(paa: boolean) {
    localStorage.setItem(LAGER_VARSLER, paa ? 'på' : 'av');
    setVarsler(paa);
  }

  async function loggUt() {
    await signOut();
    router.replace('/signin' as Route);
  }

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 py-6">
      <h1 className="sr-only">Meg</h1>

      {/* ── Hurtigbrytere: det man faktisk bytter ofte ─────────────────── */}
      <CardShell>
        <div className="flex flex-col divide-y divide-border rounded-lg bg-inset">
          <Hurtigbryter
            id="tema"
            icon={tema === 'dark' ? Moon : Sun}
            tittel="Mørkt tema"
            hint={tema === 'dark' ? 'På — lettere i mørk hall' : 'Av — lettere i sollys'}
            checked={tema === 'dark'}
            onChange={byttTema}
          />
          <Hurtigbryter
            id="varsler"
            icon={Bell}
            tittel="Push-varsler"
            hint={
              varsler
                ? 'På — men push er ikke koblet på ennå (F6-12). Valget lagres lokalt.'
                : 'Av. Valget lagres lokalt på denne telefonen.'
            }
            checked={varsler}
            onChange={byttVarsler}
          />
        </div>
      </CardShell>

      {/* ── Hvem du er ────────────────────────────────────────────────── */}
      <CardShell>
        <div className="flex flex-col gap-3 rounded-lg bg-inset p-5">
          <div className="flex items-center gap-3">
            <div className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-soft font-medium text-accent-strong text-lg">
              {(m?.name ?? session?.user?.name ?? '?').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-label text-fg">
                {m?.name ?? session?.user?.name ?? 'Mekaniker'}
              </p>
              <p className="truncate text-[12px] text-fg-muted">{session?.user?.email ?? '—'}</p>
            </div>
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-border border-t pt-3 text-[13px]">
            <dt className="text-fg-muted">Tilgjengelighet</dt>
            <dd className="flex items-center gap-1.5 text-fg">
              <span
                aria-hidden
                className={`inline-block size-2 rounded-full ${m?.active ? 'bg-success' : 'bg-fg-muted'}`}
              />
              {profil.isLoading ? '—' : m?.active ? 'Tilgjengelig' : 'Ikke tilgjengelig'}
            </dd>
            <dt className="text-fg-muted">Kapasitet</dt>
            <dd className="text-fg">{m ? `${m.capacity} jobber samtidig` : '—'}</dd>
          </dl>

          <p className="text-[12px] text-fg-muted leading-relaxed">
            Navn, kapasitet og tilgjengelighet settes av verkstedet ditt under Team &amp; tilgang.
            Skal noe endres, si fra til den som styrer kalenderen.
          </p>
        </div>
      </CardShell>

      {/* ── Navn, kallenavn og varslingslyder ─────────────────────────
          Samme komponent som forhandlerens Settings › Profil. Én innstilling,
          ett sted i koden — se `_shell/profil-kort.tsx`. */}
      <ProfilKort />

      {/* ── Sikkerhet ─────────────────────────────────────────────────── */}
      <CardShell>
        <div className="flex flex-col gap-3 rounded-lg bg-inset p-5">
          <p className="flex items-center gap-2 text-label text-fg">
            <ShieldCheck size={16} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
            Sikkerhet
          </p>

          {/* F1-17 — bytte med gjeldende passord bor i ProfilKort over.
              F1-20 / F1-22 — samme statusrad som Settings › Profil.
              Slå-av krever gjeldende passord. Resetlenka står under passordskjemaet. */}
          <ToFaktorRad
            enabled={
              session?.user && 'twoFactorEnabled' in session.user
                ? (session.user as { twoFactorEnabled?: boolean }).twoFactorEnabled
                : undefined
            }
          />
        </div>
      </CardShell>

      {/* ── Varslingskanaler ──────────────────────────────────────────── */}
      <CardShell>
        <div className="flex flex-col gap-3 rounded-lg bg-inset p-5">
          <p className="flex items-center gap-2 text-label text-fg">
            <Zap size={16} strokeWidth={1.75} className="shrink-0 text-accent-strong" />
            Hvordan du varsles
          </p>

          <Kanal icon={Bell} navn="Push på telefonen" status="Kommer" viktig />
          <Kanal icon={Phone} navn="SMS" status="Kommer" viktig />
          <Kanal icon={Mail} navn="E-post" status="På" />

          {/* ⚠️ Ærlig om hva som mangler: push og SMS er de to som betyr noe når
              man står i hallen uten appen åpen, og de er ikke koblet ennå. Å
              vise dem som «På» ville vært å love varsler som aldri kommer. */}
          <p className="text-[12px] text-fg-muted leading-relaxed">
            Push og SMS er ikke koblet ennå — de er de to som betyr mest når du står i hallen, og de
            kommer sammen med varslingsmotoren. Fram til da når vi deg på e-post.
          </p>
        </div>
      </CardShell>

      <button
        type="button"
        onClick={loggUt}
        className="flex h-11 items-center justify-center gap-2 rounded-control border border-border text-label text-fg transition-colors hover:bg-surface-2"
      >
        <LogOut size={16} strokeWidth={1.75} />
        Logg ut
      </button>
    </div>
  );
}

/** Stor bryter med tydelig trykkmål — hansker, ikke musepeker. */
function Hurtigbryter({
  id,
  icon: Icon,
  tittel,
  hint,
  checked,
  onChange,
}: {
  id: string;
  icon: LucideIcon;
  tittel: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    // Radix' Switch er en <button>, ikke en <input> — en <label> rundt den ville
    // vært en label uten kontroll. Teksten kobles derfor med aria-labelledby.
    <div className="flex min-h-[56px] items-center gap-3 px-4 py-3">
      <Icon size={20} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span id={`bryter-${id}`} className="text-label text-fg">
          {tittel}
        </span>
        <span className="truncate text-[12px] text-fg-muted">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-labelledby={`bryter-${id}`} />
    </div>
  );
}

function Kanal({
  icon: Icon,
  navn,
  status,
  viktig,
}: {
  icon: LucideIcon;
  navn: string;
  status: string;
  viktig?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={16} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
      <span className="flex-1 text-label text-fg">{navn}</span>
      <span
        className={`inline-flex h-badge items-center rounded-badge px-2 font-medium text-[11px] ${
          status === 'På' ? 'bg-success-soft text-success' : 'bg-surface-2 text-fg-muted'
        }`}
      >
        {status}
      </span>
      {viktig && <span className="sr-only">(viktig på telefon)</span>}
    </div>
  );
}
