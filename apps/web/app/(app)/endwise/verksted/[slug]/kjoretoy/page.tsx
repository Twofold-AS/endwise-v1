'use client';

import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../../../../_shell/cards';
import { LesingFeil } from '../_lesing';

export default function VerkstedKjoretoyPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';
  const data = trpc.verksted.kjoretoy.useQuery({ slug }, { enabled: Boolean(slug), retry: false });

  if (data.isError) return <LesingFeil melding={data.error.message} />;

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="text-title text-fg">Kjøretøy</h1>
        <p className="text-body text-fg-muted">Kun lesing.</p>
      </div>
      {data.isLoading ? (
        <p className="text-body text-fg-muted">Laster …</p>
      ) : (data.data?.rader.length ?? 0) === 0 ? (
        <CardShell className="p-10 text-center">
          <p className="text-label text-fg">Ingen kjøretøy</p>
        </CardShell>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          {data.data?.rader.map((k, i) => (
            <div
              key={k.id}
              className={`flex h-row items-center gap-3 bg-bg px-4 ${
                i > 0 ? 'border-border border-t' : ''
              }`}
            >
              <span className="w-28 shrink-0 font-mono text-label text-fg">{k.regNumber}</span>
              <span className="min-w-0 flex-1 truncate text-[12px] text-fg-muted">
                {[k.make, k.model].filter(Boolean).join(' ') || k.type}
              </span>
              <span className="truncate text-[12px] text-fg-muted">{k.customerName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
