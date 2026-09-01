'use client';

import { ForhandlerInfoKort } from '../_shell/forhandler-info-kort';
import { PhoneHomeMekaniker } from '../_shell/phone-home-mekaniker';
import { DineJobberHjemKort } from '../dine-jobber/_hjem-kort';

/**
 * Mekaniker-landing: telefon-hjem (kort) + samme store Dine jobber-kort på desktop.
 */
export default function MinDagPage() {
  return (
    <>
      <PhoneHomeMekaniker />
      <div className="mx-auto hidden w-full max-w-[820px] flex-col gap-3 px-3 py-4 md:flex md:px-6 md:py-7">
        <ForhandlerInfoKort />
        <DineJobberHjemKort />
      </div>
    </>
  );
}
