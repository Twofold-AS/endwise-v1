'use client';

import { BYTT_EPOST_CALLBACK } from '@endwise/auth/bytt-epost';
import { Mail, ShieldCheck, StatefulButton } from '@endwise/ui';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';

/**
 * Steg 2: bekreft e-postbytte.
 * Tokenet kommer fra lenka i e-posten. Vi kaller Better-Auth
 * `verify-email` her — det er denne handlingen som eventuelt skriver
 * den nye adressen, aldri skjemaet i innstillingene.
 */
function BekreftEpostInner() {
  const params = useSearchParams();
  const token = params?.get('token')?.trim() || null;
  const [status, setStatus] = useState<'venter' | 'ok' | 'feil'>(token ? 'venter' : 'feil');
  const [busy, setBusy] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (!token) return;
    let aktiv = true;
    setBusy('loading');
    void authClient
      .verifyEmail({ query: { token } })
      .then((res) => {
        if (!aktiv) return;
        if (res.error) {
          setStatus('feil');
          setBusy('error');
          return;
        }
        setStatus('ok');
        setBusy('success');
      })
      .catch(() => {
        if (!aktiv) return;
        setStatus('feil');
        setBusy('error');
      });
    return () => {
      aktiv = false;
    };
  }, [token]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-5">
        <Image src="/logo/logo.svg" alt="Endwise" width={44} height={44} priority />
        <div className="w-full rounded-xl border border-border bg-bg p-[5px]">
          <div className="flex flex-col gap-4 rounded-[10px] border border-border bg-inset px-5 py-6">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-fg-muted" />
              <h1 className="text-title text-fg">Bekreft e-post</h1>
            </div>
            {status === 'venter' && <p className="text-body text-fg-muted">Bekrefter lenken …</p>}
            {status === 'ok' && (
              <p className="text-body text-fg-muted">
                Bekreftet. Hvis du nettopp godkjente byttet fra den gamle adressen, har vi sendt en
                ny lenke til den nye. Åpne den for å fullføre.
              </p>
            )}
            {status === 'feil' && (
              <p className="text-body text-danger">
                Lenken er ugyldig eller utløpt. Be om et nytt bytte fra innstillingene.
              </p>
            )}
            <StatefulButton
              type="button"
              state={busy === 'loading' ? 'loading' : 'idle'}
              className="self-start"
              icon={<ShieldCheck size={15} />}
              onClick={() => {
                window.location.assign(BYTT_EPOST_CALLBACK);
              }}
            >
              Til innstillinger
            </StatefulButton>
          </div>
        </div>
        <Link
          href="/signin"
          className="text-[12px] text-fg-muted underline-offset-2 hover:underline"
        >
          Til innlogging
        </Link>
      </div>
    </div>
  );
}

export default function BekreftEpostPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-bg" />}>
      <BekreftEpostInner />
    </Suspense>
  );
}
