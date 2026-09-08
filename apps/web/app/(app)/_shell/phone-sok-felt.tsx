'use client';

import { Search } from '@endwise/ui';
import type { InputHTMLAttributes, Ref } from 'react';

/**
 * Søk-felt med ikon i egen kolonne — ikke absolutt over «Søk».
 * `.ew-felt-sm` shorthand-padding dekket ellers placeholder.
 */
export function PhoneSokFelt({
  inputRef,
  ...props
}: { inputRef?: Ref<HTMLInputElement> } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className' | 'type'
>) {
  return (
    <label className="ew-felt ew-felt-sm flex h-8 min-w-0 flex-1 items-center gap-2 px-2.5">
      <Search
        size={16}
        strokeWidth={1.75}
        data-phone-sok-ikon
        className="shrink-0 text-fg"
        aria-hidden
      />
      <input
        ref={inputRef}
        data-phone-search
        type="search"
        placeholder="Søk"
        aria-label="Søk"
        className="min-w-0 flex-1 border-0 bg-transparent p-0 text-label text-fg outline-none placeholder:text-fg-muted"
        {...props}
      />
    </label>
  );
}
