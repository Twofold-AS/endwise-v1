'use client';

import { Lock, Moon, ShieldCheck, Sun } from '@endwise/ui';
import { useEffect, useState } from 'react';
import { CardShell } from '../../_shell/cards';
import { ProfilKort } from '../../_shell/profil-kort';

/**
 * F5-19 — Settings › Profil. Egen bruker, sikkerhet og tema.
 *
 * ⚠️ 2FA-påslag (F1-11) er IKKE bygget her ennå. Innloggingsflyten med
 * engangskode finnes, men `ROLES_REQUIRING_2FA` håndheves ingen steder og
 * seed-brukerne har `twoFactorEnabled: false` — så steg 2 vises aldri.
 * Det står i klartekst under i stedet for å bli skjult bak en bryter som ikke
 * gjør noe.
 */
export default function ProfilPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    if (t === 'light' || t === 'dark') setTheme(t);
  }, []);

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    setTheme(next);
  }

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="text-title text-fg">Profil</h1>
        <p className="text-body text-fg-muted">
          Navn, kallenavn, varslingslyder, sikkerhet og utseende.
        </p>
      </div>

      <ProfilKort />

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="flex h-row-store items-center gap-3 bg-bg px-4">
          <Sun size={16} className="shrink-0 text-fg-muted" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-label text-fg">Utseende</span>
            <span className="text-[12px] text-fg-muted">Lyst tema er standard.</span>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-control items-center gap-2 rounded-control border border-border px-3 text-label text-fg transition-colors hover:bg-surface-2"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            {theme === 'light' ? 'Bytt til mørkt' : 'Bytt til lyst'}
          </button>
        </div>

        <div className="flex h-row-store items-center gap-3 border-border border-t bg-bg px-4">
          <Lock size={16} className="shrink-0 text-fg-muted" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-label text-fg">Passord</span>
            <span className="text-[12px] text-fg-muted">Endring er ikke bygget ennå.</span>
          </div>
        </div>
      </div>

      <CardShell className="p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-warn" />
          <div className="flex flex-col gap-1">
            <p className="text-label text-fg">Tofaktor (F1-11) — påslag mangler</p>
            <p className="text-[12px] text-fg-muted leading-relaxed">
              Innloggingen har steg 2 med engangskode på e-post, men det finnes ingen flate for å
              slå 2FA <b>på</b>, og <code>ROLES_REQUIRING_2FA</code> håndheves ikke server-side. En
              forhandler eller admin uten 2FA logger derfor inn med bare passord.
            </p>
          </div>
        </div>
      </CardShell>
    </div>
  );
}
