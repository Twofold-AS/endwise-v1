'use client';

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  Search,
  X,
} from '@endwise/ui';
import { useSearchParams } from 'next/navigation';
import { Suspense, useLayoutEffect } from 'react';
import { useTema } from '@/app/_lib/tema-provider';
import {
  PHONE_AVATAR_PX,
  PHONE_BAR2,
  PHONE_LOGO_PX,
  PHONE_PROFIL_SIRKEL,
  PHONE_RONNY_SIRKEL,
  ronnySizeForSirkel,
} from '@/app/(app)/_shell/phone-chrome';
import { PHONE_SAFE_TOP } from '@/app/(app)/_shell/phone-home';
import { PhoneProfilMeny } from '@/app/(app)/_shell/phone-profil-meny';
import { RONNY_PHONE_IDLE, RonnyBot } from '@/app/(app)/_workshop/ronny-bot';
import { RonnyForstorIkon, RonnyHandtak } from '@/app/(app)/_workshop/ronny-ikoner';
import { RONNY_SHEET_RADIUS_PX } from '@/app/(app)/_workshop/ronny-sheet';

/**
 * Uinnlogget visuell GO — ekte chrome/sheet/felt, ikke HTML-mock.
 * ?tema=light|dark  ?vis=chrome|meny|sheet
 */
type Vis = 'chrome' | 'meny' | 'sheet';

function lesVis(raw: string | null): Vis {
  if (raw === 'meny' || raw === 'sheet') return raw;
  return 'chrome';
}

function MikaelGoInnhold() {
  const params = useSearchParams();
  const { sett } = useTema();
  const temaParam = params?.get('tema');
  const vis = lesVis(params?.get('vis') ?? null);

  useLayoutEffect(() => {
    if (temaParam === 'light' || temaParam === 'dark') sett(temaParam);
  }, [sett, temaParam]);

  return (
    <div className={`min-h-dvh bg-bg text-fg ${PHONE_SAFE_TOP}`}>
      <Chrome vis={vis} />
      {vis === 'sheet' ? <Sheet /> : null}
    </div>
  );
}

function Chrome({ vis }: { vis: Vis }) {
  return (
    <header data-phone-top-bar className="relative bg-bg">
      <div data-phone-top-bar="1" className="flex h-row w-full items-center gap-2 px-3">
        <span
          aria-hidden
          className="inline-flex shrink-0 bg-fg"
          style={{
            width: PHONE_LOGO_PX,
            height: PHONE_LOGO_PX,
            maskImage: 'url(/logo/logo.svg)',
            maskSize: 'contain',
            maskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskImage: 'url(/logo/logo.svg)',
            WebkitMaskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
          }}
        />
        <label className="relative min-w-0 flex-1">
          <Search
            size={16}
            strokeWidth={1.75}
            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-fg"
            aria-hidden
          />
          <input
            data-phone-search
            type="search"
            placeholder="Søk"
            aria-label="Søk"
            readOnly
            className="ew-felt ew-felt-sm h-8 pr-3 pl-9 text-label"
          />
        </label>
        <span data-ronny-avatar className={PHONE_RONNY_SIRKEL}>
          <RonnyBot size={ronnySizeForSirkel(PHONE_AVATAR_PX)} idleSett={RONNY_PHONE_IDLE} />
        </span>
        <span data-phone-profile className={PHONE_PROFIL_SIRKEL}>
          M
        </span>
      </div>
      <PhoneProfilMeny
        apen={vis === 'meny'}
        onLukk={() => undefined}
        navn="Mikael"
        epost="mikael@verksted.test"
        innstillingerHref="/innstillinger?fane=konto"
      />
      <div data-phone-top-bar="2" className={PHONE_BAR2}>
        <span className="text-label text-fg">Verkstedet</span>
      </div>
      <div className="ew-haarlinje" />
    </header>
  );
}

function Sheet() {
  return (
    <div
      data-ronny-sheet
      data-ronny-flate
      className="fixed inset-x-0 bottom-0 z-[70] flex h-[80dvh] flex-col overflow-hidden bg-surface text-fg shadow-none"
      style={{
        borderTopLeftRadius: RONNY_SHEET_RADIUS_PX,
        borderTopRightRadius: RONNY_SHEET_RADIUS_PX,
      }}
      role="dialog"
      aria-label="Ronny"
    >
      <div className="flex justify-center pt-0.5">
        <span className="flex min-h-8 items-center justify-center px-6 py-0.5">
          <RonnyHandtak />
        </span>
      </div>
      <div
        data-ronny-sheet-header
        className="flex h-row shrink-0 items-center justify-between px-2"
      >
        <span className="inline-flex size-11 items-center justify-center text-fg">
          <RonnyForstorIkon />
        </span>
        <span className="truncate text-title text-fg">Ronny</span>
        <span className="inline-flex size-11 items-center justify-center text-fg">
          <X size={18} strokeWidth={2} />
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col bg-surface text-fg">
        <div className="min-h-0 flex-1 px-3 pt-2 text-label text-fg-muted">
          Spør Ronny om jobber, kunder eller lager.
        </div>
        <div data-ronny-composer className="relative w-full shrink-0 px-3 pt-1.5 pb-3">
          <PromptInput onSubmit={() => undefined}>
            <PromptInputBody className="min-w-0 flex-1">
              <PromptInputTextarea readOnly placeholder="Spør Ronny …" />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputSubmit />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}

export default function MikaelGoSide() {
  return (
    <Suspense>
      <MikaelGoInnhold />
    </Suspense>
  );
}
