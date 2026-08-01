/**
 * @endwise/ui
 *
 * ⚠️ LES `docs/UI-PAKKER.md` FØR DU LAGER EN NY KOMPONENT HER.
 * Endwise bygger UI av EKSTERNE pakker. Egen kode kun når ingen pakke dekker behovet.
 */

// ─── [ART50-UI] AI Act art. 50 — JURIDISK PÅKREVD. Ikke fjern. ─────────
export {
  AI_DISCLOSURE_TEXT,
  AI_HANDOVER_TEXT,
  AiDisclosure,
  type AiDisclosureProps,
  type DisclosureLocale,
  HumanHandoverNotice,
} from './compliance/ai-disclosure.tsx';
// ─── Endwise-primitiver (F0-12) ─────────────────────────────────────────
export { Badge, type BadgeProps, badgeVariants } from './components/badge.tsx';
// ─── shadcn/ui — struktur ───────────────────────────────────────────────
export { Button, buttonVariants } from './components/button.tsx';
export { Area, type AreaProps, Line } from './components/dither-kit/area.tsx';
// ─── dither-kit — ENESTE chart-motor (techstack §1: Recharts er ute) ────
export { AreaChart, type AreaChartProps, LineChart } from './components/dither-kit/area-chart.tsx';
// dither-kit standalone
export { DitherAvatar } from './components/dither-kit/avatar.tsx';
export { Bar } from './components/dither-kit/bar.tsx';
export { BarChart } from './components/dither-kit/bar-chart.tsx';
export { DitherButton } from './components/dither-kit/button.tsx';
export { ActiveDot, Dot } from './components/dither-kit/dot.tsx';
export { DitherGradient } from './components/dither-kit/gradient.tsx';
export { Grid } from './components/dither-kit/grid.tsx';
export { Legend } from './components/dither-kit/legend.tsx';
export { Pie } from './components/dither-kit/pie.tsx';
export { PieChart } from './components/dither-kit/pie-chart.tsx';
export { Radar } from './components/dither-kit/radar.tsx';
export { RadarChart } from './components/dither-kit/radar-chart.tsx';
export { Sparkline, type SparklineProps } from './components/dither-kit/sparkline.tsx';
export { Tooltip } from './components/dither-kit/tooltip.tsx';
export { XAxis } from './components/dither-kit/x-axis.tsx';
export { YAxis } from './components/dither-kit/y-axis.tsx';
export type { ButtonProps as MotionButtonProps } from './components/motion/button/base.tsx';
// ─── beUI — tilstand og bevegelse ───────────────────────────────────────
export { Button as MotionButton } from './components/motion/button/base.tsx';
export {
  type ButtonState,
  StatefulButton,
  type StatefulButtonProps,
} from './components/motion/button/stateful.tsx';
// ─── lucide-react — eneste ikonbibliotek (kuratert barrel) ──────────────
export * from './icons.ts';
/** Kanoniske bevegelses-tokens (SPRING_PRESS, SPRING_SWAP, EASE_OUT …). Ikke funn opp egne. */
export * from './lib/ease.ts';
export { useHoverCapable } from './lib/hooks/use-hover-capable.ts';
export { cn } from './lib/utils.ts';
export { Btn, type BtnProps } from './primitives/btn.tsx';
export { Card, CardTitle } from './primitives/card.tsx';
export { Chip, type ChipProps } from './primitives/chip.tsx';
export { Input, type InputProps } from './primitives/input.tsx';
// ─── matrix-loaders — HELE settet (93 loadere) ──────────────────────────
// Vendorisert. Proprietær lisens — se src/vendor/matrix-loaders/VENDOR.md.
export * from './vendor/matrix-loaders/index.ts';
