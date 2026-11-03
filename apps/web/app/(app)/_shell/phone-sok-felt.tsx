'use client';

import { Search } from '@endwise/ui';
import type { InputHTMLAttributes, Ref } from 'react';

/**
 * Søk-felt 48 px. Ikon i egen kolonne — ikke absolutt over plassholder.
 */
export function PhoneSokFelt({
  inputRef,
  ...props
}: { inputRef?: Ref<HTMLInputElement> } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className' | 'type'
>) {
  return (
    <label className="ew-felt ew-felt-sok flex h-11 min-w-0 flex-1 items-center gap-2 px-3">
      <Search
        size={18}
        strokeWidth={1.75}
        data-phone-sok-ikon
        className="pointer-events-none shrink-0 text-fg-muted"
        aria-hidden
      />
      <input
        ref={inputRef}
        data-phone-search
        type="text"
        inputMode="search"
        autoComplete="off"
        placeholder="Søk"
        aria-label="Søk"
        className="w-0 min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-body text-fg outline-none placeholder:text-fg-muted"
        {...props}
      />
    </label>
  );
}
