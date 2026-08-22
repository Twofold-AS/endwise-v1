'use client';

import { KeyRound, Lock, Moon, ShieldCheck, Sun } from '@endwise/ui';
import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { lesTema, settTema, type Tema } from '../../_lib/tema';
import { CardShell } from '../../_shell/cards';
import { ProfilKort } from '../../_shell/profil-kort';
import { AvatarVelger } from './_avatar-velger';

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
  /**
   * ⚠️ RETTET 20.08.2026: denne siden hadde sin EGEN kopi av tema-logikken, og
   * den lagret like lite som den i shellet. To kopier av samme regel kan bare
   * bli enige ved et sammentreff. Begge bruker nå `_lib/tema.ts`.
   */
  const [theme, setTheme] = useState<Tema>('light');

  /**
   * F6-19 — seeden til EGEN avatar er `user.id`, ikke noe `profile.meg`
   * returnerer. Ruta returnerer den bevisst ikke: klienten har den allerede
   * herfra, og to kilder til samme seed er to steder den kan bli feil.
   */
  const me = trpc.session.me.useQuery();

  useEffect(() => {
    setTheme(lesTema());
  }, []);

  function toggleTheme() {
    const next: Tema = theme === 'light' ? 'dark' : 'light';
    settTema(next);
    setTheme(next);
  }

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="text-title text-fg">Profil</h1>
        <p className="text-body text-fg-muted">
          Navn, kallenavn, avatar, varslingslyder, sikkerhet og utseende.
        </p>
      </div>

      <ProfilKort />

      <AvatarVelger seed={me.data?.userId ?? null} />

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

        {/* F1-15/F1-16 — sto som «Endring er ikke bygget ennå» fram til
            22.08.2026. Nå finnes resetflyten.
            ⚠️ Dette er RESET, ikke «bytt passord med det gamle som bevis» —
            den er F1-17 og hører hjemme i samme rad når den bygges. Teksten
            sier derfor hva som faktisk skjer: en lenke på e-post. */}
        <div className="flex h-row-store items-center gap-3 border-border border-t bg-bg px-4">
          <Lock size={16} className="shrink-0 text-fg-muted" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-label text-fg">Passord</span>
            <span className="text-[12px] text-fg-muted">
              Byttes med en lenke på e-post. Du blir logget ut på alle enheter.
            </span>
          </div>
          <a
            href="/glemt-passord"
            className="inline-flex h-control shrink-0 items-center gap-2 rounded-control border border-border px-3 text-fg text-label transition-colors hover:bg-surface-2"
          >
            <KeyRound size={15} strokeWidth={1.75} />
            Bytt passord
          </a>
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
