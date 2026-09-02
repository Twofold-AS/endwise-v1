/**
 * @endwise/ui
 * Les `docs/UI-PAKKER.md` før du lager en ny komponent her.
 * Endwise bygger UI av eksterne pakker. Egen kode kun når ingen pakke dekker behovet.
 */

// [ART50-UI] AI Act art. 50 — juridisk påkrevd. Ikke fjern.
export {
  AI_DISCLOSURE_TEXT,
  AI_HANDOVER_TEXT,
  AiDisclosure,
  type AiDisclosureProps,
  type DisclosureLocale,
  HumanHandoverNotice,
} from './compliance/ai-disclosure.tsx';
// Endwise-primitiver (F0-12)
export {
  Avatar,
  type AvatarBevegelse,
  type AvatarProps,
  type AvatarValg,
  BLOUB_FARGE_IDER,
  BLOUB_FARGE_LABEL,
  BLOUB_HVILE,
  COLORS,
  type ColorId,
  hexForFarge,
  losFarge,
  skalFølgePeker,
  staffFargeStil,
} from './components/avatar.tsx';
export { Badge, type BadgeProps, badgeVariants } from './components/badge.tsx';
// shadcn/ui — struktur
export { Button, buttonVariants } from './components/button.tsx';
// Recharts via shadcn Chart-mønsteret — eneste chart-motor (ui-pakker §2)
export {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  CHART_COLORS,
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from './components/chart.tsx';
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
} from './components/dialog.tsx';
export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuHeader,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './components/dropdown-menu.tsx';
export { Galaxy, type GalaxyProps } from './components/galaxy.tsx';
export { Grainient, type GrainientProps } from './components/grainient.tsx';
// shadcn/ui — chat (ui-pakker §9). Hentet.
export {
  Message,
  MessageAvatar,
  MessageBubble,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from './components/message.tsx';
export {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
} from './components/message-scroller.tsx';
/*
 * dither-kit — ikke eksportert
 * Eier ba om at dither-kit fjernes fra UI-et. All bruk er borte fra `apps/web`
 * (grafer → tabeller, avatar → profil-ikon, gradient-header → rolig aksentflate).
 * Hvorfor eksporten er tatt bort og ikke bare bruken: barrel-en drar hele
 * modulgrafen inn i klient-bundelen selv når ingen komponent bruker den. Målt:
 * dither-kit-koden lå fortsatt i bundelen etter at siste bruk var fjernet.
 * Å eksportere noe ingen skal bruke er å sende det til hver eneste besøkende.
 * Filene er ikke slettet (`src/components/dither-kit/`, 40 filer), og
 * dither-kit står fortsatt i techstacken som chart-motor. Skal det reverseres:
 * lim tilbake blokka under. Skal det ut for godt, er det en techstack-endring
 * (§1/§2) — da må det avklares hva som tegner charts i stedet.
 * export { Area, type AreaProps, Line } from './components/dither-kit/area.tsx';
 * export { AreaChart, type AreaChartProps, LineChart } from './components/dither-kit/area-chart.tsx';
 * export { DitherAvatar } from './components/dither-kit/avatar.tsx';
 * export { Bar } from './components/dither-kit/bar.tsx';
 * export { BarChart } from './components/dither-kit/bar-chart.tsx';
 * export { DitherButton } from './components/dither-kit/button.tsx';
 * export { ActiveDot, Dot } from './components/dither-kit/dot.tsx';
 * export { DitherGradient } from './components/dither-kit/gradient.tsx';
 * export { Grid } from './components/dither-kit/grid.tsx';
 * export { Legend } from './components/dither-kit/legend.tsx';
 * export { Pie } from './components/dither-kit/pie.tsx';
 * export { PieChart } from './components/dither-kit/pie-chart.tsx';
 * export { Radar } from './components/dither-kit/radar.tsx';
 * export { RadarChart } from './components/dither-kit/radar-chart.tsx';
 * export { Sparkline, type SparklineProps } from './components/dither-kit/sparkline.tsx';
 * export { Tooltip } from './components/dither-kit/tooltip.tsx';
 * export { XAxis } from './components/dither-kit/x-axis.tsx';
 * export { YAxis } from './components/dither-kit/y-axis.tsx';
 */
export type { ButtonProps as MotionButtonProps } from './components/motion/button/base.tsx';
// beUI — tilstand og bevegelse
export { Button as MotionButton } from './components/motion/button/base.tsx';
export {
  type ButtonState,
  StatefulButton,
  type StatefulButtonProps,
} from './components/motion/button/stateful.tsx';
export {
  type ChatStatus,
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from './components/prompt-input.tsx';
export {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceInput,
  QuestionnaireChoiceLabel,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from './components/questionnaire.tsx';
export { Switch } from './components/switch.tsx';
export {
  ToolPart,
  ToolPartDetalj,
  ToolPartGodkjenning,
  type ToolPartStatus,
} from './components/tool-part.tsx';
export { useBloubIdleLiv } from './hooks/use-bloub-idle-liv.ts';
export { useBloubPapir } from './hooks/use-bloub-papir.ts';
// lucide-react — eneste ikonbibliotek (kuratert barrel)
export * from './icons.ts';
/** Kanoniske bevegelses-tokens (SPRING_PRESS, SPRING_SWAP, EASE_OUT …). Ikke funn opp egne. */
export * from './lib/ease.ts';
export { useHoverCapable } from './lib/hooks/use-hover-capable.ts';
export { cn } from './lib/utils.ts';
export { Btn, type BtnProps } from './primitives/btn.tsx';
export { Card, CardTitle } from './primitives/card.tsx';
export { Chip, type ChipProps } from './primitives/chip.tsx';
export { Input, type InputProps } from './primitives/input.tsx';
// matrix-loaders — hele settet (93 loadere)
// Vendorisert. Proprietær lisens — se src/vendor/matrix-loaders/vendor.md.
export * from './vendor/matrix-loaders/index.ts';
