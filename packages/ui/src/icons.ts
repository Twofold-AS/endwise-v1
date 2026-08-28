/**
 * Kuratert ikon-barrel. ui-pakker §6: appene importerer aldri ikoner direkte
 * fra `lucide-react` — alt går gjennom denne fila.
 * Leveranse 2
 * Barrel-en har fortsatt to kilder, men balansen har snudd:
 * `./icons.generated.ts` — eierens egne SVG-er, generert fra
 * `src/assets/icons/*.svg` av `scripts/build-icons.ts`. **62 ikoner.**
 * `lucide-react` — resten, inntil egne SVG-er finnes for dem.
 * Et ikon flyttes fra lucide-blokka til den genererte ved å legge SVG-en i
 * `assets/icons/`, kjøre `build:icons` og flytte navnet — ingen kallsteder
 * endres, fordi `createLucideIcon` returnerer nøyaktig `LucideIcon`.
 * `type LucideIcon` blir hos lucide uansett. Den er typen, ikke et ikon.
 * Så lenge lista er delt, er ikonsettet visuelt blandet: egne ikoner har
 * `stroke-width` 2 og en litt annen strektone enn lucides 1.75. Det er synlig,
 * og det forsvinner først når lucide-blokka er tom. Se
 * `docs/notater/ikonregister.md` for hvilke som mangler.
 * Slug-avvik: lucide har døpt om `circle-help` → `CircleQuestionMark` og
 * `filter` → `Funnel`. Egne SVG-er må hete det lucide heter i dag.
 */

// LUCIDE — venter på egne SVG-er
export {
  ArrowUpRight,
  BellRing,
  BookOpen,
  // eierens AI-main.svg viste seg å være
  // Kun en liten sirkel (spenn 4,8 av 24) — nav-punktet «AI-verktøy» rendret
  // som en dott. Se ikonregisteret; en ekte hjerne må tegnes.
  Brain,
  Building2,
  CalendarCheck,
  ChartColumn,
  ChevronLeft,
  ChevronRight,
  Command,
  Copy,
  Download,
  ExternalLink,
  // Vis/skjul passord. Ingen UI-pakke i §-kartet dekker et
  // passordfelt med avsløringsknapp (shadcn har `Input`, ikke en variant),
  // så kontrollen er egenskrevet i `app/_auth/felter.tsx`. Se ui-pakker §8.
  Eye,
  EyeOff,
  Flag,
  Gauge,
  HardHat,
  LifeBuoy,
  type LucideIcon,
  MapPin,
  Megaphone,
  MessageSquarePlus,
  Newspaper,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plug,
  Plus,
  ShoppingCart,
  Store,
  TrendingDown,
  TrendingUp,
  Upload,
  UserCog,
  Volume2,
  VolumeX,
} from 'lucide-react';
// Egne ikoner — generert fra src/assets/icons/ av scripts/build-icons.ts
export {
  Activity,
  AlarmClockOff,
  ArrowLeftRight,
  Bell,
  Blocks,
  CalendarDays,
  Camera,
  Car,
  ChartLine,
  ChartPie,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  CirclePercent,
  CircleQuestionMark,
  CircleUser,
  ClipboardList,
  Clock,
  ClockArrowUp,
  CreditCard,
  FilePlus,
  FolderOpen,
  Funnel,
  Globe,
  Handshake,
  Image,
  ImagePlus,
  Inbox,
  Info,
  KeyRound,
  LayoutDashboard,
  List,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MessageCirclePlus,
  MessageCircleWarning,
  MessageCircleX,
  MessageSquare,
  Moon,
  PanelLeft,
  Phone,
  Receipt,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Tags,
  Timer,
  Trash2,
  TriangleAlert,
  UserPlus,
  Users,
  Wrench,
  X,
  Zap,
} from './icons.generated.ts';
