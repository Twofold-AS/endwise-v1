/**
 * Kuratert ikon-barrel. ui-pakker §6: appene importerer aldri ikoner direkte
 * fra `lucide-react` — alt går gjennom denne fila.
 *
 * To kilder, én API:
 * `./icons.generated.ts` — SVG-er i `src/assets/icons/` via `scripts/build-icons.ts`.
 *   Chrome / sidebar / hjem er Disarto Regular (MIT, pin `d536bd5`) — se
 *   `docs/notater/disarto-ikoner.md`. Resten er eierens egne strek-SVG-er.
 * `lucide-react` — det som fortsatt mangler (bl.a. hard-hat, bike, sailboat).
 *
 * Et ikon flyttes fra lucide-blokka til den genererte ved å legge SVG-en i
 * `assets/icons/`, kjøre `build:icons` og flytte navnet — ingen kallsteder
 * endres, fordi `createLucideIcon` returnerer nøyaktig `LucideIcon`.
 * `type LucideIcon` blir hos lucide uansett. Den er typen, ikke et ikon.
 *
 * Disarto Regular er fylte evenodd-path-er (`fill=currentColor`), ikke lucide-strek.
 * Mikael 07.09.2026: aksepter filled-path. Ikke installer `disarto-icons-react`.
 *
 * Beholdt uten Disarto (ikke tegnet): hard-hat · handshake (eier-SVG) · bike ·
 * sailboat · clock-arrow-up (eier-SVG).
 */

// LUCIDE — venter på egne / Disarto-SVG-er
export {
  BellRing,
  Bike,
  BookOpen,
  Bot,
  // eierens AI-main.svg viste seg å være
  // Kun en liten sirkel (spenn 4,8 av 24) — nav-punktet «AI-verktøy» rendret
  // som en dott. Se ikonregisteret; en ekte hjerne må tegnes.
  Brain,
  Command,
  Copy,
  Download,
  ExternalLink,
  // Vis/skjul passord. Ingen UI-pakke i §-kartet dekker et
  // passordfelt med avsløringsknapp (shadcn har `Input`, ikke en variant),
  // så kontrollen er egenskrevet i `app/_auth/felter.tsx`. Se ui-pakker §8.
  Eye,
  EyeOff,
  Gauge,
  HardHat,
  type LucideIcon,
  Megaphone,
  MessageSquarePlus,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Plus,
  Sailboat,
  TrendingDown,
  TrendingUp,
  Upload,
  UserCog,
  Volume2,
  VolumeX,
} from 'lucide-react';
// Egne + Disarto Regular — generert fra src/assets/icons/ av scripts/build-icons.ts
export {
  Activity,
  AlarmClockOff,
  ArrowLeftRight,
  ArrowUpRight,
  Bell,
  Blocks,
  Building2,
  CalendarCheck,
  CalendarDays,
  Camera,
  Car,
  ChartColumn,
  ChartLine,
  ChartPie,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
  Flag,
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
  LifeBuoy,
  List,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  MessageCirclePlus,
  MessageCircleWarning,
  MessageCircleX,
  MessageSquare,
  Moon,
  Package,
  PanelLeft,
  Phone,
  Receipt,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
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
