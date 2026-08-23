'use client';

import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../../../../_shell/cards';
import { LesingFeil } from '../_lesing';

export default function VerkstedKunderPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';
  const data = trpc.verksted.kunder.useQuery({ slug }, { enabled: Boolean(slug), retry: false });

  if (data.isError) return <LesingFeil melding={data.error.message} />;

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="text-title text-fg">Kunder</h1>
        <p className="text-body text-fg-muted">
          Kun lesing. E-post og telefon vises ikke — det er persondata støtte ikke trenger.
        </p>
      </div>
      {data.isLoading ? (
        <p className="text-body text-fg-muted">Laster …</p>
      ) : (
        <CardShell className="p-10 text-center">
          <p className="text-label text-fg">Kundekontakt er skjult i Se verkstedet.</p>
        </CardShell>
      )}
    </div>
  );
}
