'use client';

import { MAGIC_LINK_ENROLL_UTEN_SESJON } from '@endwise/auth/magic-link';
import {
  etter2faBekreftet,
  etter2faKodeBekreftet,
  fortsettEtter2faKvittering,
  KODER_FILNAVN,
  kanFullforeKoder,
  kanStarteTotpOppsett,
  koderSomTekstfil,
  norskTotpEnableFeil,
  plukkBackupKoder,
  plukkTotpUri,
  secretFraTotpUri,
  TOTP_OPPSETT_INGRESS,
} from '@endwise/auth/to-faktor-oppsett';
import { ClipboardList, Copy, Download, ShieldCheck, StatefulButton } from '@endwise/ui';
import type { Route } from 'next';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { authClient, useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { Field, INPUT } from '../_auth/felter';
import { SIGNIN_STI } from '../signin/signin-steg';

/**
 * Senere opt-in for TOTP. Krever ekte innlogget sesjon (ikke enroll-kake
 * fra brukt magic-lenke). Ingen passord, ingen e-postkode.
 */
export default function ToFaktorOppsettPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: session, isPending: sesjonLaster } = useSession();
  const [steg, setSteg] = useState<'app' | 'kode' | 'koder' | 'av' | 'ferdig'>('app');
  const [kode, setKode] = useState('');
  const [koder, setKoder] = useState<string[]>([]);
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [lastetNed, setLastetNed] = useState(false);
  const [kopiert, setKopiert] = useState(false);
  const [bekreftetLagret, setBekreftetLagret] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);
  const [busy, setBusy] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const codeRef = useRef<HTMLInputElement>(null);
  const startet = useRef(false);

  useEffect(() => {
    if (koder.length > 0) return;
    if (steg !== 'app') return;
    if (
      session?.user &&
      'twoFactorEnabled' in session.user &&
      session.user.twoFactorEnabled === true
    ) {
      setSteg('av');
    }
  }, [session, steg, koder.length]);

  useEffect(() => {
    if (steg === 'kode') codeRef.current?.focus();
  }, [steg]);

  async function startOppsett() {
    if (startet.current || sesjonLaster) return;
    if (!kanStarteTotpOppsett(Boolean(session?.user))) {
      setFeil(MAGIC_LINK_ENROLL_UTEN_SESJON);
      setBusy('error');
      return;
    }
    startet.current = true;
    setFeil(null);
    setBusy('loading');
    try {
      const res = await authClient.twoFactor.enable({});
      if (res.error && !/already/i.test(res.error.message ?? '')) {
        setFeil(
          norskTotpEnableFeil({
            code: res.error.code,
            message: res.error.message,
          }),
        );
        setBusy('error');
        startet.current = false;
        return;
      }
      const hentet = plukkBackupKoder(res.data ?? res);
      if (hentet.length > 0) setKoder(hentet);
      const uri = plukkTotpUri(res.data ?? res);
      if (!uri) {
        setFeil(MAGIC_LINK_ENROLL_UTEN_SESJON);
        setBusy('error');
        startet.current = false;
        return;
      }
      setTotpUri(uri);
      setBusy('idle');
      setSteg('kode');
    } catch (error) {
      setFeil(norskTotpEnableFeil({ message: (error as Error).message }));
      setBusy('error');
      startet.current = false;
    }
  }

  async function bekreft(event: FormEvent) {
    event.preventDefault();
    setFeil(null);
    setBusy('loading');
    try {
      const res = await authClient.twoFactor.verifyTotp({ code: kode.trim() });
      if (res.error) {
        setFeil(
          norskTotpEnableFeil({
            code: res.error.code,
            message: res.error.message ?? 'Feil kode.',
          }),
        );
        setBusy('error');
        setKode('');
        codeRef.current?.focus();
        return;
      }
      await authClient.revokeOtherSessions().catch(() => {
        console.warn('[2fa] revokeOtherSessions feilet');
      });
      setSteg(etter2faKodeBekreftet().steg);
      setBusy('idle');
    } catch (error) {
      setFeil((error as Error).message);
      setBusy('error');
    }
  }

  function lastNedKoder() {
    const blob = new Blob([koderSomTekstfil(koder)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const lenke = document.createElement('a');
    lenke.href = url;
    lenke.download = KODER_FILNAVN;
    lenke.click();
    URL.revokeObjectURL(url);
    setLastetNed(true);
    setFeil(null);
  }

  async function kopierKoder() {
    await navigator.clipboard.writeText(koder.join('\n'));
    setKopiert(true);
    setFeil(null);
  }

  function fullforKoder() {
    if (!kanFullforeKoder({ lastetNed, kopiert, bekreftetLagret })) {
      setFeil('Last ned eller kopier kodene, og bekreft at du har lagret dem.');
      return;
    }
    setSteg(etter2faBekreftet().steg);
    setBusy('success');
  }

  function fortsett() {
    void utils.session.me
      .fetch()
      .then((me) => {
        window.location.assign(fortsettEtter2faKvittering(me.landing).destinasjon);
      })
      .catch(() => {
        window.location.assign(fortsettEtter2faKvittering().destinasjon);
      });
  }

  const koderOk = kanFullforeKoder({ lastetNed, kopiert, bekreftetLagret });
  const secret = totpUri ? secretFraTotpUri(totpUri) : null;

  const tittel =
    steg === 'ferdig'
      ? 'Tofaktor er slått på'
      : steg === 'koder'
        ? 'Lagre gjenopprettingskodene'
        : steg === 'kode'
          ? 'Bekreft med autentikator'
          : steg === 'av'
            ? 'Tofaktor er på'
            : 'Sett opp autentikator';
  const ingress =
    steg === 'ferdig'
      ? 'Neste innlogging: magic link + kode fra appen. En stjålet innboks er ikke nok.'
      : steg === 'koder'
        ? 'Kodene vises bare nå. Last dem ned eller kopier dem — uten dem er du utestengt hvis appen forsvinner.'
        : steg === 'kode'
          ? 'Legg til Endwise i autentikator-appen og skriv den 6-sifrede koden.'
          : steg === 'av'
            ? 'Autentikator-appen er allerede satt opp. Selvbetjent slå-av er stengt.'
            : TOTP_OPPSETT_INGRESS;

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 text-fg">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image src="/logo/logo.svg" alt="Endwise" width={44} height={44} priority />
          <h1 className="text-title text-fg">{tittel}</h1>
          <p className="text-center text-body text-fg-muted">{ingress}</p>
        </div>

        {steg === 'app' ? (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-[5px]">
            <div className="rounded-lg bg-inset p-4 text-[12px] text-fg-muted leading-relaxed">
              Vi lager en hemmelighet til Microsoft Authenticator eller Google Authenticator. Ingen
              passord. Bind appen før du skriver koden.
            </div>
            {feil ? <p className="px-4 text-[12px] text-danger">{feil}</p> : null}
            <div className="px-1.5 pt-1 pb-1">
              <StatefulButton
                type="button"
                state={sesjonLaster ? 'loading' : busy}
                className="w-full"
                loadingText="Starter …"
                successText="Klar"
                errorText="Prøv igjen"
                icon={<ShieldCheck size={15} />}
                onClick={() => void startOppsett()}
              >
                Start oppsett
              </StatefulButton>
              {feil === MAGIC_LINK_ENROLL_UTEN_SESJON ? (
                <a
                  href={SIGNIN_STI}
                  className="mt-2 inline-flex h-control w-full items-center justify-center rounded-control border border-border px-3 text-fg text-label"
                >
                  Tilbake til innlogging
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        {steg === 'kode' ? (
          <form
            onSubmit={(e) => void bekreft(e)}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-[5px]"
          >
            <div className="flex flex-col gap-3 rounded-lg bg-inset p-4">
              {secret ? (
                <p className="break-all font-mono text-[12px] text-fg">
                  Nøkkel: {secret}
                  <button
                    type="button"
                    className="ml-2 underline"
                    onClick={() => void navigator.clipboard.writeText(secret)}
                  >
                    Kopier
                  </button>
                </p>
              ) : null}
              {totpUri ? <p className="break-all text-[11px] text-fg-muted">{totpUri}</p> : null}
              <Field id="tfa-kode" label="App-kode">
                <input
                  id="tfa-kode"
                  ref={codeRef}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={kode}
                  onChange={(ev) => setKode(ev.target.value.replace(/\D/g, ''))}
                  className={`${INPUT} text-center font-mono text-[16px] tracking-[0.5em] tabular-nums`}
                  placeholder="••••••"
                />
              </Field>
              {feil && <p className="text-[12px] text-danger">{feil}</p>}
            </div>
            <div className="px-1.5 pt-1 pb-1">
              <StatefulButton
                type="submit"
                state={busy}
                className="w-full"
                loadingText="Bekrefter …"
                successText="Bekreftet"
                errorText="Feil kode"
                icon={<ShieldCheck size={15} />}
              >
                Bekreft kode
              </StatefulButton>
            </div>
          </form>
        ) : null}

        {steg === 'koder' ? (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-[5px]">
            <div className="flex flex-col gap-3 rounded-lg bg-inset p-4">
              <p className="flex items-start gap-2 text-[12px] text-fg-muted leading-relaxed">
                <ClipboardList size={13} className="mt-px shrink-0" />
                <span>
                  Hver kode kan brukes én gang. Vi viser dem ikke igjen. Ikke lagre dem i samme
                  innboks som magic-lenken.
                </span>
              </p>
              <ol className="grid grid-cols-1 gap-1.5 font-mono text-[13px] text-fg tabular-nums">
                {koder.map((kodeTekst) => (
                  <li
                    key={kodeTekst}
                    className="rounded-control border border-border bg-bg px-3 py-1.5"
                  >
                    {kodeTekst}
                  </li>
                ))}
              </ol>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={lastNedKoder}
                  className="inline-flex h-control items-center gap-1.5 rounded-control border border-border px-3 text-fg text-label hover:bg-surface-2"
                >
                  <Download size={14} />
                  Last ned
                </button>
                <button
                  type="button"
                  onClick={() => void kopierKoder()}
                  className="inline-flex h-control items-center gap-1.5 rounded-control border border-border px-3 text-fg text-label hover:bg-surface-2"
                >
                  <Copy size={14} />
                  {kopiert ? 'Kopiert' : 'Kopier'}
                </button>
              </div>
              <label className="flex items-start gap-2 text-[12px] text-fg leading-relaxed">
                <input
                  type="checkbox"
                  checked={bekreftetLagret}
                  onChange={(ev) => setBekreftetLagret(ev.target.checked)}
                  className="mt-0.5"
                />
                <span>Jeg har lagret kodene på et trygt sted utenfor denne maskinen.</span>
              </label>
              {feil && <p className="text-[12px] text-danger">{feil}</p>}
            </div>
            <div className="px-1.5 pt-1 pb-1">
              <button
                type="button"
                onClick={fullforKoder}
                disabled={!koderOk}
                className="inline-flex h-control w-full items-center justify-center rounded-control bg-fg px-4 text-bg text-label disabled:cursor-not-allowed disabled:opacity-50"
              >
                Fullfør oppsett
              </button>
            </div>
          </div>
        ) : null}

        {steg === 'av' ? (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-[5px]">
            <div className="rounded-lg bg-inset p-4 text-[12px] text-fg-muted leading-relaxed">
              Tofaktor kan ikke slås av selv. Be en leder om å tilbakestille.
            </div>
            <div className="px-1.5 pt-1 pb-1">
              <button
                type="button"
                onClick={fortsett}
                className="inline-flex h-control w-full items-center justify-center rounded-control bg-fg px-4 text-bg text-label"
              >
                Fortsett
              </button>
            </div>
          </div>
        ) : null}

        {steg === 'ferdig' ? (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-[5px]">
            <div className="rounded-lg bg-inset p-4 text-[12px] text-fg-muted leading-relaxed">
              Tofaktor er på. Neste innlogging: magic link + app-kode. Ingen «husk denne enheten».
            </div>
            <div className="px-1.5 pt-1 pb-1">
              <button
                type="button"
                onClick={fortsett}
                className="inline-flex h-control w-full items-center justify-center rounded-control bg-fg px-4 text-bg text-label"
              >
                Fortsett
              </button>
            </div>
          </div>
        ) : null}

        {steg !== 'ferdig' ? (
          <p className="mt-4 text-center text-[12px] text-fg-muted">
            <button
              type="button"
              onClick={() => {
                void authClient.signOut().finally(() => router.replace('/signin' as Route));
              }}
              className="underline underline-offset-2 hover:text-fg"
            >
              Logg ut
            </button>
          </p>
        ) : null}
      </div>
    </main>
  );
}
