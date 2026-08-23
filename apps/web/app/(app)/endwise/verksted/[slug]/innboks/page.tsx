'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../../../../_shell/cards';
import { LesingFeil } from '../_lesing';

export default function VerkstedInnboksPage() {
  const params = useParams<{ slug: string }>();
  const search = useSearchParams();
  const slug = params?.slug ?? '';
  const fra = search?.get('fra');
  const q = fra ? `?fra=${encodeURIComponent(fra)}` : '';
  const data = trpc.verksted.innboks.useQuery({ slug }, { enabled: Boolean(slug), retry: false });

  if (data.isError) return <LesingFeil melding={data.error.message} />;

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="text-title text-fg">Innboks</h1>
        <p className="text-body text-fg-muted">Kun lesing. Send er stengt.</p>
      </div>
      {data.isLoading ? (
        <p className="text-body text-fg-muted">Laster …</p>
      ) : (data.data?.rader.length ?? 0) === 0 ? (
        <CardShell className="p-10 text-center">
          <p className="text-label text-fg">Ingen tråder</p>
        </CardShell>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          {data.data?.rader.map((t, i) => (
            <Link
              key={t.id}
              href={`/endwise/verksted/${slug}/innboks/${t.id}${q}` as Route}
              className={`flex h-row-store items-center gap-3 bg-bg px-4 hover:bg-surface-2 ${
                i > 0 ? 'border-border border-t' : ''
              }`}
            >
              <span className="min-w-0 flex-1 truncate text-label text-fg">
                {t.subject || 'Uten emne'}
              </span>
              <span className="text-[12px] text-fg-muted">{t.kind}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
