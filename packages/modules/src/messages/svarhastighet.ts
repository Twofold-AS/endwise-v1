/**
 * Svarhastighet — median førstesvar.
 * En prøve er tiden fra første inbound i en tråd til første outbound etterpå.
 * Rolling 7 dager. Tom mengde = «For lite data», ikke 0.
 */

export function medianTall(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  if (s.length % 2 === 1) return s[mid] ?? null;
  const a = s[mid - 1];
  const b = s[mid];
  if (a == null || b == null) return null;
  return Math.round((a + b) / 2);
}

export function forsteSvarMs(inboundAt: Date, outboundAt: Date): number {
  return Math.max(0, outboundAt.getTime() - inboundAt.getTime());
}

export function svarhastighetFraPar(par: readonly { inboundAt: Date; outboundAt: Date }[]): {
  medianMs: number | null;
  n: number;
} {
  const samples = par.map((p) => forsteSvarMs(p.inboundAt, p.outboundAt));
  return { medianMs: medianTall(samples), n: samples.length };
}
