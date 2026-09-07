# Disarto Regular — kuratert innkobling (F5-20)

**Mikael GO 07.09.2026.** Ikke en blind lucide-wipe. Chrome / sidebar / hjem-kort
først. Én barrel (`@endwise/ui`). SVG-ene er vendorisert i
`packages/ui/src/assets/icons/` og går gjennom `scripts/build-icons.ts`.

Kilde: https://github.com/Disarto/disarto-icons · MIT · Regular
Pin: `d536bd59ae5c1baa8e7d07b599bb51946e113eb9` (1.0.0)

Filnavnet i Endwise er **lucide-sluggen** (så `createLucideIcon` / eksportnavnet
står). Disarto-filen er kilden.

## Mapping — Endwise → Disarto Regular

| Endwise-eksport | Endwise-fil | Disarto Regular | Treff |
|---|---|---|---|
| `LayoutDashboard` | `layout-dashboard.svg` | `dashboard.svg` | near |
| `CalendarDays` | `calendar-days.svg` | `calendar-dots.svg` | near |
| `Settings` | `settings.svg` | `gear.svg` | near |
| `Building2` | `building-2.svg` | `building.svg` | near |
| `MapPin` | `map-pin.svg` | `pin-map.svg` | near |
| `LogOut` | `log-out.svg` | `sign-out.svg` | near |
| `X` | `x.svg` | `close.svg` | near |
| `Trash2` | `trash-2.svg` | `trash.svg` | near |
| `Activity` | `activity.svg` | `pulse.svg` | near |
| `Inbox` | `inbox.svg` | `inbox.svg` | exact |
| `Users` | `users.svg` | `users.svg` | exact |
| `Package` | `package.svg` | `package.svg` | exact |
| `Car` | `car.svg` | `car.svg` | exact |
| `Check` | `check.svg` | `check.svg` | exact |
| `ChevronDown` | `chevron-down.svg` | `chevron-down.svg` | exact |
| `ChevronLeft` | `chevron-left.svg` | `chevron-left.svg` | exact |
| `ChevronRight` | `chevron-right.svg` | `chevron-right.svg` | exact |
| `Flag` | `flag.svg` | `flag.svg` | exact |
| `Lock` | `lock.svg` | `lock.svg` | exact |
| `ShieldCheck` | `shield-check.svg` | `shield-check.svg` | exact |
| `UserPlus` | `user-plus.svg` | `user-plus.svg` | exact |
| `FilePlus` | `file-plus.svg` | `file-plus.svg` | exact |
| `ShoppingCart` | `shopping-cart.svg` | `shopping-cart.svg` | exact |
| `ArrowUpRight` | `arrow-up-right.svg` | `arrow-up-right.svg` | exact |
| `CalendarCheck` | `calendar-check.svg` | `calendar-check.svg` | exact |
| `Bell` | `bell.svg` | `bell.svg` | exact |
| `CircleUser` | `circle-user.svg` | `user-circle.svg` | near |
| `LifeBuoy` | `life-buoy.svg` | `lifebuoy.svg` | near |
| `ArrowLeftRight` | `arrow-left-right.svg` | `arrows-left-right.svg` | near |
| `ChartColumn` | `chart-column.svg` | `chart-bar.svg` | near |
| `ClipboardList` | `clipboard-list.svg` | `list-checks.svg` | near |
| `CircleAlert` | `circle-alert.svg` | `alert-circle.svg` | near |
| `Mail` | `mail.svg` | `envelope.svg` | near (ingen `mail.svg`) |
| `Tags` | `tags.svg` | `tag.svg` | near (én merkelapp) |

### Svake near — tatt inn, ikke blokkert

| Endwise-eksport | Endwise-fil | Disarto Regular | Merknad |
|---|---|---|---|
| `Wrench` | `wrench.svg` | `toolbox.svg` | Tjenester / jobbflate. Verktøykasse, ikke skiftenøkkel. |
| `Store` | `store.svg` | `shopping-bag.svg` | Butikk-kontekst. Pose, ikke fasade. |

## Beholdt — ikke funnet / ikke funnet opp

| Endwise-eksport | Kilde nå | Hvorfor |
|---|---|---|
| `HardHat` | lucide | Ikke i Disarto Regular. Mekaniker-kontekst. |
| `Handshake` | eier-SVG | Ikke i Disarto Regular. Samarbeid-kort. |
| `Bike` | lucide | Ikke i Disarto Regular. MC på jobb-kort. |
| `Sailboat` | lucide | Ikke i Disarto Regular. Båt på jobb-kort. |
| `ClockArrowUp` | eier-SVG | Ikke i Disarto Regular. «Be om mer tid». |

## Bevisst ikke byttet

- `PanelLeftClose` / `PanelLeftOpen` — Disarto `collapse`/`expand` er diagonale piler, ikke sidebar-toggle. Blir lucide til en panel-variant tegnes.
- `MessageSquarePlus` — Disarto har `chat-square`, ikke plus-varianten. Quick action «Ny melding» blir lucide.

## Stil

Disarto Regular er **fylte evenodd-path-er** (`fill="currentColor"`), ikke
lucide-strek. Codegen (`build-icons.ts`) setter `fill: currentColor` +
`stroke: none`. Det er med vilje.

## Regenerer

```
pnpm --filter @endwise/ui build:icons
```
