import { LAGER_STATUS_LABEL, LAGER_STATUS_TONE, type LagerStatusId } from './lager-katalog';

export type { LagerStatusId } from './lager-katalog';
export {
  LAGER_STATUS_LABEL,
  LAGER_STATUS_TONE,
  lagerStatusFor,
} from './lager-katalog';

export function LagerStatusMerke({ status }: { status: LagerStatusId }) {
  return (
    <span
      data-lager-status={status}
      className={`inline-flex h-badge items-center rounded-badge px-2 text-[11px] font-[450] ${LAGER_STATUS_TONE[status]}`}
    >
      {LAGER_STATUS_LABEL[status]}
    </span>
  );
}
