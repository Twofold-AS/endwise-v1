'use client';

import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { LESING_TITLE } from '../../../../../_lib/plattform';
import { CardShell } from '../../../../../_shell/cards';
import { LesingFeil } from '../../_lesing';

export default function VerkstedTradPage() {
  const params = useParams<{ slug: string; id: string }>();
  const slug = params?.slug ?? '';
  const threadId = params?.id ?? '';
  const data = trpc.verksted.innboksMeldinger.useQuery(
    { slug, threadId },
    { enabled: Boolean(slug && threadId), retry: false },
  );

  if (data.isError) return <LesingFeil melding={data.error.message} />;

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4 px-8 py-7">
      <h1 className="text-title text-fg">{data.data?.traad.subject || 'Samtale'}</h1>
      {data.isLoading ? (
        <p className="text-body text-fg-muted">Laster …</p>
      ) : (
        <div className="flex flex-col gap-2">
          {data.data?.meldinger.map((m) => (
            <CardShell key={m.id} className="p-3">
              <p className="text-[12px] text-fg-muted">{m.authorId}</p>
              <p className="mt-1 text-body text-fg">{m.body}</p>
            </CardShell>
          ))}
        </div>
      )}
      <button
        type="button"
        disabled
        title={LESING_TITLE}
        className="h-control rounded-control border border-border bg-surface-2 text-label text-fg-muted"
      >
        Send
      </button>
    </div>
  );
}
