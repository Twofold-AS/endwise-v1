# Økt: Fix A — Kunder alfa-rail Apple Contacts

## Hva er gjort (F5-02 / BIT 2)

- Full norsk indeks `#` + A–Å (Q/W/X/Z/Æ/Ø). Tomme bokstaver dimmes.
- Rail i list-viewport: `sticky` + like `flex-1`-spor. Ikke `absolute`/`justify-center`.
- Scroll-to-seksjon + sticky seksjonshoder. `#` = topp. Filter/pager vekk fra lista.
- Preview: `h-dvh` + søk `shrink-0` (ingen grå flex-1-stripe). `nextjs-portal` skjult.
- Live `/kunder` + `/kunder-preview` deler `KunderAlfaListe`.
- FIX B: ingen klone-rails i andre Bit-previews.

## Hva gikk galt

- Browser-audit (~390×844) bekreftet fire feil: midtstilt rail, Next.js Dev Tools over bokstaver, grå søk-stripe ved filter/tom/side 2, ufullstendig alfabet.

## Hvilke fikser ble gjort

- `PhoneSokFelt` `flex-1` som direkte barn av `flex-col min-h-dvh` vokste til stripe — wrappet i `shrink-0`.
- `min-h-[420px]` + bokstavfilter fjernet (fantom-spacer).
- Next.js 16 Dev Tools (`nextjs-portal`) skjult på preview.
- Bunnsinnfelt i list-scrollporten så S/Ø/Å pinner flush (Contacts).

## Neste steg

- Mikael browser-review på `/kunder-preview`. **Ikke merge #178.**
