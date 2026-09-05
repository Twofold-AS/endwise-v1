import type { ReactNode } from 'react';
import { MarkedsFooter, MarkedsNav } from './markeds-chrome';

const KOLONNE = 'mx-auto w-full max-w-[720px] px-6 md:px-8';

export function OffentligSide({ tittel, children }: { tittel: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-bg text-fg">
      <div className="mx-auto w-full max-w-[1120px] px-6 md:px-8">
        <MarkedsNav />
      </div>
      <article className={`${KOLONNE} pt-10 pb-8`}>
        <h1 className="font-semibold text-[36px] text-fg tracking-tight sm:text-[44px]">
          {tittel}
        </h1>
        <div className="mt-8 flex flex-col gap-5 text-[17px] text-fg-muted leading-relaxed">
          {children}
        </div>
      </article>
      <div className="mx-auto w-full max-w-[1120px] px-6 md:px-8">
        <MarkedsFooter />
      </div>
    </main>
  );
}
