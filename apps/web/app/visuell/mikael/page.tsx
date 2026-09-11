'use client';

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  X,
} from '@endwise/ui';
import { useSearchParams } from 'next/navigation';
import { Suspense, useLayoutEffect } from 'react';
import { useTema } from '@/app/_lib/tema-provider';
import { FORHANDLER_NAV } from '@/app/(app)/_shell/nav';
import {
  PHONE_AVATAR_PX,
  PHONE_BAR2,
  PHONE_LOGO_PX,
  PHONE_PROFIL_SIRKEL,
  PHONE_RONNY_SIRKEL,
  ronnySizeForSirkel,
} from '@/app/(app)/_shell/phone-chrome';
import { PhoneHScroll } from '@/app/(app)/_shell/phone-h-scroll';
import { PHONE_SAFE_TOP } from '@/app/(app)/_shell/phone-home';
import { PhoneProfilMeny } from '@/app/(app)/_shell/phone-profil-meny';
import { PhoneSokFelt } from '@/app/(app)/_shell/phone-sok-felt';
import { RONNY_PHONE_IDLE, RonnyBot } from '@/app/(app)/_workshop/ronny-bot';
import type { RonnyAnsikt } from '@/app/(app)/_workshop/ronny-idle';
import { RonnyForminskIkon, RonnyForstorIkon } from '@/app/(app)/_workshop/ronny-ikoner';
import { RONNY_SHEET_RADIUS_PX } from '@/app/(app)/_workshop/ronny-sheet';

/**
 * Uinnlogget visuell GO — ekte chrome/sheet/felt, ikke HTML-mock.
 * ?tema=light|dark  ?vis=chrome|meny|sheet|sheet-full|sok
 */
type Vis = 'chrome' | 'meny' | 'sheet' | 'sheet-full' | 'sok' | 'ansikt';

function lesVis(raw: string | null): Vis {
  if (
    raw === 'meny' ||
    raw === 'sheet' ||
    raw === 'sheet-full' ||
    raw === 'sok' ||
    raw === 'ansikt'
  )
    return raw;
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
      {vis === 'ansikt' ? <AnsiktGo /> : <Chrome vis={vis} />}
      {vis === 'sheet' ? <Sheet /> : null}
      {vis === 'sheet-full' ? <SheetFull /> : null}
      {vis === 'sok' ? <SokGo /> : null}
    </div>
  );
}

const RONNY_ANSIKT: { id: RonnyAnsikt; label: string }[] = [
  { id: 'curieux', label: 'Nysgjerrig' },
  { id: 'heureux', label: 'Glad' },
  { id: 'wink', label: 'Blunk' },
  { id: 'surpris', label: 'Overrasket' },
];

function AnsiktGo() {
  return (
    <div data-ronny-ansikt-go className="mx-auto flex max-w-[390px] flex-col gap-6 px-4 py-8">
      <p className="text-title text-fg">Ronny — tillatte ansikt</p>
      <div className="grid grid-cols-2 gap-4">
        {RONNY_ANSIKT.map((a) => (
          <div
            key={a.id}
            data-ronny-ansikt-kort={a.id}
            className="flex flex-col items-center gap-2 rounded-[24px] border border-divide bg-card px-3 py-5"
          >
            <span className="inline-flex size-16 items-center justify-center rounded-full bg-fg">
              <RonnyBot size={ronnySizeForSirkel(56)} ansikt={a.id} />
            </span>
            <p className="text-label text-fg">{a.label}</p>
          </div>
        ))}
      </div>
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
        <PhoneSokFelt readOnly />
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
        tvingVis
      />
      <div data-phone-top-bar="2" className={PHONE_BAR2}>
        <PhoneHScroll>
          {FORHANDLER_NAV.filter((d) => !d.requiresShopFlag).map((item, i) => (
            <span
              key={item.key}
              data-phone-dest={item.key}
              className={`inline-flex h-8 shrink-0 items-center rounded-full px-3 text-label text-fg ${
                i === 0 ? 'bg-sidebar-active' : ''
              }`}
            >
              {item.label}
            </span>
          ))}
        </PhoneHScroll>
      </div>
      <div className="ew-haarlinje" />
    </header>
  );
}

function SokGo() {
  const dest = FORHANDLER_NAV.filter((d) => !d.requiresShopFlag);
  return (
    <div
      data-phone-search-overlay
      className="fixed inset-0 z-[80] flex flex-col bg-bg md:static md:min-h-[70dvh]"
    >
      <div className="flex h-row shrink-0 items-center gap-2 px-3">
        <PhoneSokFelt defaultValue="kar" readOnly />
        <span className="shrink-0 px-1 text-label text-fg">Avbryt</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-8">
        <div
          data-phone-sok-dest-stripe
          className="flex gap-3 overflow-x-auto overflow-y-hidden py-3 touch-pan-x"
        >
          {dest.map((item) => {
            const I = item.icon;
            return (
              <span
                key={item.key}
                data-phone-sok-dest-ikon={item.key}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-inset text-fg"
              >
                <I size={20} strokeWidth={1.75} />
              </span>
            );
          })}
        </div>
        <section data-phone-sok-gruppe="Kunde" className="pt-4">
          <h2 className="pb-1 text-[12px] font-[650] text-fg-muted">Kunde</h2>
          <p className="flex min-h-11 items-center text-label text-fg">Kari Nordmann</p>
        </section>
        <section data-phone-sok-gruppe="Sider" className="pt-4">
          <h2 className="pb-1 text-[12px] font-[650] text-fg-muted">Sider</h2>
          <p className="flex min-h-11 items-center text-label text-fg">Kunder</p>
        </section>
      </div>
    </div>
  );
}

function SheetInnhold({ forstor }: { forstor: boolean }) {
  return (
    <>
      <div
        data-ronny-sheet-header
        className="flex h-row shrink-0 items-center justify-between px-2"
      >
        <span className="inline-flex size-11 items-center justify-center text-fg">
          {forstor ? <RonnyForstorIkon /> : <RonnyForminskIkon />}
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
    </>
  );
}

function Sheet() {
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-fg/25" data-ronny-scrim />
      <div
        data-ronny-sheet
        data-ronny-flate
        data-ronny-hoyde={80}
        className="fixed inset-x-0 bottom-0 z-[70] flex h-[80dvh] flex-col overflow-hidden bg-surface text-fg shadow-none"
        style={{
          borderTopLeftRadius: RONNY_SHEET_RADIUS_PX,
          borderTopRightRadius: RONNY_SHEET_RADIUS_PX,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        }}
        role="dialog"
        aria-label="Ronny"
      >
        <SheetInnhold forstor />
      </div>
    </>
  );
}

function SheetFull() {
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-fg/25" data-ronny-scrim />
      <div
        data-ronny-sheet
        data-ronny-flate
        data-ronny-hoyde={100}
        className="fixed inset-x-0 top-0 z-[70] flex h-[100dvh] flex-col overflow-hidden bg-surface text-fg shadow-none"
        style={{
          height: '100dvh',
          top: 0,
          borderTopLeftRadius: RONNY_SHEET_RADIUS_PX,
          borderTopRightRadius: RONNY_SHEET_RADIUS_PX,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        }}
        role="dialog"
        aria-label="Ronny"
      >
        <SheetInnhold forstor={false} />
      </div>
    </>
  );
}

export default function MikaelGoSide() {
  return (
    <Suspense>
      <MikaelGoInnhold />
    </Suspense>
  );
}
