'use client';

/**
 * Telefon-iframe 390×844. Samme origin — scrollbar bor i iframe.
 * nextjs-portal skjules i iframen uten å røre preview-filene.
 */
export function PrReviewRamme({ src, tittel }: { src: string; tittel: string }) {
  return (
    <div
      data-pr-review-ramme
      className="w-full overflow-hidden rounded-[24px] border border-border bg-bg md:w-[390px] md:shrink-0"
    >
      <iframe
        data-pr-review-iframe
        src={src}
        title={tittel}
        width={390}
        height={844}
        className="block h-[844px] w-full bg-bg"
        onLoad={(e) => {
          try {
            const doc = e.currentTarget.contentDocument;
            if (!doc) return;
            const stil = doc.createElement('style');
            stil.textContent = 'nextjs-portal{display:none!important}';
            doc.head.appendChild(stil);
          } catch {
            /* kun same-origin */
          }
        }}
      />
    </div>
  );
}
