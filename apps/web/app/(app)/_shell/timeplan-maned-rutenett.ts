import {
  osloKalenderdag,
  osloPlusDager,
  osloUkedagMandag0,
  osloVeggklokke,
} from '../_lib/oslo-dag';

export type TimeplanManedCelle = {
  nokkel: string;
  ymd: string;
  dag: number;
  utenfor: boolean;
};

/** Månedsgitter med ledende tomme celler (mandag først). */
export function timeplanManedRutenett(valgtYmd: string): TimeplanManedCelle[] {
  const ymd = osloKalenderdag(valgtYmd);
  const [y, m] = ymd.split('-').map(Number);
  const forste = `${y}-${String(m).padStart(2, '0')}-01`;
  const nesteMnd = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const antall = Number(osloPlusDager(nesteMnd, -1).slice(8, 10));
  const mandag0 = osloUkedagMandag0(osloVeggklokke(forste, 12, 0));
  const out: TimeplanManedCelle[] = [];
  for (let i = 0; i < mandag0; i++) {
    out.push({ nokkel: `${forste}-pad-${i}`, ymd: '', dag: 0, utenfor: true });
  }
  for (let d = 1; d <= antall; d++) {
    const celle = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    out.push({ nokkel: celle, ymd: celle, dag: d, utenfor: false });
  }
  return out;
}
