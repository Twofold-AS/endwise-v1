/**
 * Amicro dither charts — re-eksport av vendorisert kilde.
 * Les `packages/ui/src/vendor/amicro/VENDOR.md` før du rører filene.
 */
export {
  DitherDonutChart,
  type DitherDonutChartProps,
  type DitherDonutSlice,
} from '../vendor/amicro/dither-donut.tsx';
export {
  DitherGrowthChart,
  type DitherGrowthChartProps,
  paintDitherGrowth,
} from '../vendor/amicro/dither-growth.tsx';
export {
  type DitherRevenueSeries,
  RevenueLineChart,
  type RevenueLineChartProps,
} from '../vendor/amicro/dither-revenue.tsx';
export {
  type DitherStackedBand,
  DitherStackedChart,
  type DitherStackedChartProps,
  type DitherStackedRow,
} from '../vendor/amicro/dither-stacked.tsx';
