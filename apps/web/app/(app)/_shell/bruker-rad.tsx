'use client';

import { Avatar, LogOut, UserCog } from '@endwise/ui';
import { trpc } from '@/lib/trpc';

/**
 * F6-19 — DEG, NEDERST I SIDEBAREN.
 *
 * ── ⚠️ OMGJORT 20.08.2026 (eiers beslutning) ──────────────────────────────
 * Raden hadde en chevron som åpnet en meny med «Profil» og «Logg ut». Nå er
 * chevronen byttet mot et **logout-ikon som logger ut direkte**, og Profil er
 * flyttet tilbake til Settings-flyouten.
 *
 * Argumentet mot en navigerende chevron står fortsatt — en nedoverpil lover en
 * meny. Men det gjelder ikke her lenger: et logout-ikon lover ikke en meny, det
 * lover utlogging, og det er nøyaktig det knappen gjør. Affordansen er ærlig,
 * bare på en annen måte enn før.
 *
 * ⛔ **Raden er IKKE lenger klikkbar som helhet.** Da Profil lå bak den, hadde
 * den et sted å gå; nå har den det ikke. En rad som ser trykkbar ut og ikke
 * gjør noe, er verre enn en rad som er ren visning — så avatar, navn og rolle
 * er tekst, og det eneste som kan trykkes er ikonet ytterst.
 */
export function BrukerRad({
  navn,
  rolle,
  collapsed,
  onLoggUt,
}: {
  navn: string;
  rolle: string;
  collapsed: boolean;
  onLoggUt: () => void | Promise<void>;
}) {
  /**
   * Egen seed og egne avatarvalg. `session.me` gir IDen, `profile.meg` valgene.
   *
   * ⚠️ `retry: false` som ellers for profilkall: er man ikke innlogget, skal
   * raden bare vise seg selv uten valg — ikke prøve på nytt i evighet.
   */
  const me = trpc.session.me.useQuery();
  const profil = trpc.profile.meg.useQuery(undefined, { retry: false });
  const seed = me.data?.userId ?? null;

  const avatar = seed ? (
    /**
     * ⛔ `hover` her, `stille` i lister. Humør er alltid happy — ett ansikt
     * per person, seeden er user.id.
     */
    <Avatar
      seed={seed}
      valg={profil.data?.avatar ? { ...profil.data.avatar, humor: 'happy' } : { humor: 'happy' }}
      navn=""
      size={collapsed ? 28 : 26}
      bevegelse="hover"
    />
  ) : (
    <span className="inline-grid size-[26px] shrink-0 place-items-center rounded-control bg-surface-2 text-fg-muted">
      <UserCog size={15} strokeWidth={1.75} />
    </span>
  );

  /**
   * ⚠️ **Ingen bekreftelsesdialog, med vilje.** Utlogging er ikke destruktivt:
   * ingenting går tapt, og veien tilbake er å logge inn igjen. En «er du
   * sikker?» på en reversibel handling er friksjon uten gevinst — og den lærer
   * folk å klikke bort dialoger, som er verre den dagen noe FAKTISK er farlig.
   *
   * ⛔ Prisen er at et feilklikk logger deg ut. Den er dempet på tre måter:
   * knappen er liten og står ytterst (ikke i veien for noe annet), den har både
   * `title` og `aria-label` i klartekst, og den blir rød på hover — så den sier
   * hva den er FØR du trykker.
   *
   * ⚠️ I kollapset sidebar er det ingen plass til både avatar og knapp. Der er
   * avataren selv utloggingsknappen, med samme tittel — ellers ville
   * utlogging vært utilgjengelig uten å utvide sidebaren først.
   */
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => void onLoggUt()}
        title={`Logg ut (${navn})`}
        aria-label={`Logg ut (${navn})`}
        className="flex h-11 w-full items-center justify-center rounded-control transition-colors hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-ring"
      >
        {avatar}
      </button>
    );
  }

  return (
    <div className="flex h-11 w-full items-center gap-2.5 rounded-control px-2">
      {avatar}
      {/* Navn over rolle, som i kontekstbytteren over — to linjer med samme
          rytme leses som samme system. */}
      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span className="truncate text-label text-fg">{navn}</span>
        <span className="truncate text-[12px] text-fg-muted">{rolle}</span>
      </span>
      <button
        type="button"
        onClick={() => void onLoggUt()}
        title="Logg ut"
        aria-label="Logg ut"
        className="flex size-7 shrink-0 items-center justify-center rounded-control text-fg-muted transition-colors hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-ring"
      >
        <LogOut size={15} strokeWidth={1.75} />
      </button>
    </div>
  );
}
