'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { authClient, signIn } from '@/lib/auth-client';

/**
 * F1-02 — Innlogging. PRODUKSJON = telefon-OTP + obligatorisk e-post-2FA (F1);
 * denne siden bruker Better-Auths e-post/passord for DEMO-kontoer (2FA av på
 * disse — se seed). Produksjonsflyten svekkes ikke: OTP/2FA-pluginene står, og
 * demo-brukerne er dev-only seed.
 */
export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn.email({ email, password });
    if (res.error) {
      setError(res.error.message ?? 'Innlogging feilet');
      setBusy(false);
      return;
    }
    // Sett aktiv organisasjon (tenant) → tRPC-context får tenant + rolle.
    const orgs = await authClient.organization.list();
    const first = orgs.data?.[0];
    if (first) await authClient.organization.setActive({ organizationId: first.id });
    router.push('/dashboard'); // (app)-guarden sender mekanikere videre til /min-dag
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 text-fg">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image src="/logo/logo.svg" alt="Endwise" width={44} height={44} priority />
          <h1 className="font-semibold text-fg text-lg tracking-tight">Logg inn på Endwise</h1>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-[5px]"
        >
          <div className="flex flex-col gap-3 rounded-lg bg-[#0e0e0e] p-4">
            <label className="flex flex-col gap-1 text-fg-muted text-xs">
              E-post
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                className="rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-fg outline-none placeholder:text-fg-faint"
                placeholder="deg@twofold.no"
              />
            </label>
            <label className="flex flex-col gap-1 text-fg-muted text-xs">
              Passord
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                className="rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-fg outline-none placeholder:text-fg-faint"
                placeholder="••••••••••••"
              />
            </label>
            {error && <p className="text-danger text-xs">{error}</p>}
          </div>
          <div className="px-1.5 pt-1 pb-1">
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-primary px-3 py-2 font-medium text-primary-foreground text-sm transition hover:brightness-110 disabled:opacity-50"
            >
              {busy ? 'Logger inn…' : 'Logg inn'}
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-fg-faint text-xs">
          Demo-kontoer seedes med <code className="text-fg-muted">pnpm db:seed</code> — se rapporten
          for e-post/passord. Produksjon bruker telefon-OTP + e-post-2FA.
        </p>
      </div>
    </main>
  );
}
