'use client';

import { CircleQuestionMark, LifeBuoy } from '@endwise/ui';
import { CardMedia, CardShell } from '../_shell/cards';

/**
 * F5-11 — HELPDESK.
 *
 * ⚠️ 05.08.2026: «Åpne supportkanalen» er FJERNET herfra (eiers beslutning).
 * Samtalen med Endwise bor i Innboks › Endwise — samme meldingssystem, samme
 * SSE, samme sted som alle andre samtaler. En egen inngang her ville vært en
 * andre dør til det samme rommet, og da må brukeren gjette hvilken som er
 * «riktig».
 *
 * Det som blir igjen er helpdesken: hjelpeartikler og selvbetjening.
 */
export default function HelpdeskPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="text-title text-fg">Helpdesk</h1>
        <p className="text-body text-fg-muted">Hjelpeartikler og veiledninger for Endwise.</p>
      </div>

      <CardShell>
        <CardMedia className="flex flex-col items-center gap-2 p-12 text-center">
          <CircleQuestionMark size={24} className="text-fg-muted" />
          <p className="text-label text-fg">Ingen hjelpeartikler ennå</p>
          <p className="max-w-md text-[12px] text-fg-muted leading-relaxed">
            Artikkelbasen er ikke bygget. Den hører til F5-11, sammen med support-agenten som skal
            svare førstelinje.
          </p>
        </CardMedia>
      </CardShell>

      <p className="flex items-center gap-1.5 text-[12px] text-fg-muted">
        <LifeBuoy size={14} />
        Trenger du et menneske? Skriv til oss i <b>Innboks › Endwise</b>.
      </p>
    </div>
  );
}
