import { JOBB_STATUS_LABEL, JOBB_STATUS_TONE, jobbStatusFraNotat } from './status-katalog';

export type { JobbStatusNokkel } from './status-katalog';
export { JOBB_STATUS_LABEL, JOBB_STATUS_TONE, jobbStatusFraNotat } from './status-katalog';

export function StatusMerke({
  status,
  notes,
  className = '',
}: {
  status?: string | null;
  notes?: string | null;
  className?: string;
}) {
  const nokkel = jobbStatusFraNotat(status, notes);
  return (
    <span
      data-status-merke={nokkel}
      className={`inline-flex h-badge items-center rounded-badge px-2 text-[11px] font-[450] ${JOBB_STATUS_TONE[nokkel]} ${className}`}
    >
      {JOBB_STATUS_LABEL[nokkel]}
    </span>
  );
}
