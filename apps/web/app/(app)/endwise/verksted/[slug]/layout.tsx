'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { trpc } from '@/lib/trpc';
import { LESING_TITLE, tilbakeHref } from '../../../_lib/plattform';

/**
 * Se verkstedet — lesing. Banner under topbar. Ingen setActive.
 */
export default function VerkstedInspectLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ slug: string }>();
  const search = useSearchParams();
  const slug = params?.slug ?? '';
  const tilbake = tilbakeHref(search?.get('fra'));
  const meta = trpc.verksted.meta.useQuery({ slug }, { enabled: Boolean(slug), retry: false });

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex h-row items-center justify-between gap-3 bg-warn-soft px-4 text-warn">
        <p className="min-w-0 truncate text-label">
          Du ser {meta.data?.name ?? '…'} · kun lesing · {slug}
        </p>
        <Link
          href={tilbake as Route}
          className="shrink-0 text-label underline-offset-2 hover:underline"
        >
          Tilbake til Endwise
        </Link>
      </div>
      <div data-lesing="true" title={LESING_TITLE} className="min-h-0 flex-1">
        {children}
      </div>
    </div>
  );
}
