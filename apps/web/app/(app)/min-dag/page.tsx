'use client';

import { PhoneHomeMekaniker } from '../_shell/phone-home-mekaniker';
import { DineJobberFlate } from '../dine-jobber/_flate';

/**
 * Mekaniker-landing: telefon-hjem (kort) + desktop Dine jobber.
 */
export default function MinDagPage() {
  return (
    <>
      <PhoneHomeMekaniker />
      <div className="hidden md:block">
        <DineJobberFlate />
      </div>
    </>
  );
}
