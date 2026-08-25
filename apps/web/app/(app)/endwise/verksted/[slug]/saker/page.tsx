'use client';

import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../../../../_shell/cards';
import { fmtDateTime, STATUS_LABEL, STATUS_TONE } from '../../../../bookinger/_status';
import { LesingFeil } from '../_lesing';

export default function VerkstedSakerPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';
  const data = trpc.verksted.saker.useQuery({ slug }, { enabled: Boolean(slug), retry: false });

  if (data.isError) return <LesingFeil melding={data.error.message} />;

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="text-title text-fg">Jobber</h1>
        <p className="text-body text-fg-muted">Kun lesing.</p>
      </div>
      {data.isLoading ? (
        <p className="text-body text-fg-muted">Laster …</p>
      ) : (data.data?.rader.length ?? 0) === 0 ? (
        <CardShell className="p-10 text-center">
          <p className="text-label text-fg">Ingen saker</p>
        </CardShell>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          {data.data?.rader.map((b, i) => (
            <div
              key={b.id}
              className={`flex h-row-store items-center gap-4 bg-bg px-4 ${
                i > 0 ? 'border-border border-t' : ''
              }`}
            >
              <span className="w-36 shrink-0 text-[12px] text-fg-muted">
                {fmtDateTime(b.startsAt)}
              </span>
              <span className="min-w-0 flex-1 truncate text-label text-fg">
                {b.regNumber ?? b.customerName ?? 'Sak'}
              </span>
              <span className="truncate text-[12px] text-fg-muted">{b.serviceName}</span>
              <span
                className={`inline-flex h-badge items-center rounded-badge px-2 font-medium text-[11px] ${
                  STATUS_TONE[b.status] ?? 'bg-surface-2 text-fg-muted'
                }`}
              >
                {STATUS_LABEL[b.status] ?? b.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
