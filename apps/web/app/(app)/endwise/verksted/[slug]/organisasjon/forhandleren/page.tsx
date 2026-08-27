'use client';

import { useParams } from 'next/navigation';
import { ForhandlerKort } from '../../../../../organisasjon/forhandleren/_kort';

export default function InspectForhandlerenPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="text-title text-fg">Forhandleren</h1>
        <p className="text-body text-fg-muted">Kun lesing. Skriving er stengt.</p>
      </div>
      <ForhandlerKort lesing slug={slug} />
    </div>
  );
}
