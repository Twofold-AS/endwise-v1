import type { Metadata } from 'next';
import { PR_REVIEW_DELER, PR_REVIEW_INGRESS, PR_REVIEW_TITTEL } from './_innhold';
import { PrReviewRamme } from './_ramme';
import './preview.css';

export const metadata: Metadata = {
  title: PR_REVIEW_TITTEL,
  description: PR_REVIEW_INGRESS,
};

/**
 * Offentlig review-flate for PR #178. Ikke en produkt-rute.
 * Ingen ny pakke — ramme er border + iframe (Mobbin, uten skygge).
 */
export default function PrReviewSide() {
  return (
    <div className="min-h-dvh bg-bg text-fg" data-pr-review="go" data-skjul="nextjs-portal">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-10 px-4 py-8 md:px-8 md:py-10">
        <header className="flex flex-col gap-4">
          <p className="text-[12px] text-fg-muted">Offentlig gjennomgang · uten innlogging</p>
          <h1 className="text-title text-fg">{PR_REVIEW_TITTEL}</h1>
          <p className="max-w-[640px] text-body text-fg-muted">{PR_REVIEW_INGRESS}</p>
          <nav aria-label="Innhold" className="flex flex-wrap gap-2">
            {PR_REVIEW_DELER.map((d) => (
              <a
                key={d.id}
                href={`#${d.id}`}
                className="inline-flex h-8 items-center rounded-pill border border-border px-3 text-label text-fg"
              >
                {d.nr} {d.tittel}
              </a>
            ))}
          </nav>
        </header>

        {PR_REVIEW_DELER.map((d) => (
          <section
            key={d.id}
            id={d.id}
            data-pr-review-seksjon={d.id}
            className="flex flex-col gap-5 border-border border-t pt-8 md:flex-row md:items-start md:gap-8"
          >
            <PrReviewRamme src={d.rute} tittel={`${d.tittel} preview`} />
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <p className="text-[12px] text-fg-muted">
                Del {d.nr} · preview {d.rute}
              </p>
              <h2 className="text-title text-fg">
                {d.nr}. {d.tittel}
              </h2>
              <p className="text-body text-fg">
                <span className="font-[650]">Nytt fra Claude. </span>
                {d.nytt}
              </p>
              <p className="text-body text-fg">
                <span className="font-[650]">Ekte data (tRPC). </span>
                {d.ekte}
              </p>
              <p className="text-body text-fg">
                <span className="font-[650]">Ærlig stubb. </span>
                {d.stub}
              </p>
              <p className="text-body text-fg">
                <span className="font-[650]">Test dette. </span>
                {d.test}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href={d.rute}
                  className="inline-flex h-8 items-center rounded-pill border border-fg bg-fg px-3 text-label text-bg"
                >
                  Åpne i fullskjerm
                </a>
                <a
                  href={d.liveRute}
                  className="inline-flex h-8 items-center rounded-pill border border-border px-3 text-label text-fg"
                >
                  Live {d.liveRute}
                </a>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
