'use client';

import { ShieldCheck } from '@endwise/ui';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../../_shell/cards';

/** F7/F3-12 — Mekanikerens egen kompetanse + sertifiseringsstatus. */
export default function MinKompetansePage() {
  const certs = trpc.mechanic.myCertifications.useQuery();
  const rows = certs.data ?? [];

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-4 px-6 py-7">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} className="text-primary" />
        <h1 className="font-semibold text-fg text-xl tracking-tight">Min kompetanse</h1>
      </div>

      <CardShell>
        <div className="rounded-lg bg-inset">
          <ul className="divide-y divide-border">
            {rows.length === 0 && (
              <li className="px-4 py-3 text-fg-faint text-sm">Ingen registrerte ferdigheter.</li>
            )}
            {rows.map((c) => {
              const exp = c.certificationExpiresAt ? new Date(c.certificationExpiresAt) : null;
              const soon = exp ? (exp.getTime() - Date.now()) / 86_400_000 < 60 : false;
              return (
                <li key={c.skillKey} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <span className="flex-1 truncate text-fg">{c.skillKey}</span>
                  <span className="text-fg-muted text-xs">nivå {c.level}</span>
                  {exp && (
                    <span className={`text-xs ${soon ? 'text-warn' : 'text-fg-faint'}`}>
                      sert. t.o.m. {exp.toLocaleDateString('nb-NO')}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </CardShell>
    </div>
  );
}
