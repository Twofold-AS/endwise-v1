'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

/**
 * Fluid Functionalism-kontrakt (tilpasset, ikke Base UI):
 * Desktop = inset + offcanvas. Ingen ikon-skinne.
 * Peek (hover/klikk) når lukket. Bredde 160–360. Cookie kun desktop.
 * Telefon-drawer persisteres aldri.
 */
export const SIDEBAR_COOKIE_NAME = 'sidebar_state';
export const SIDEBAR_WIDTH_COOKIE = 'sidebar_width';
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
export const SIDEBAR_MIN_WIDTH = 160;
export const SIDEBAR_MAX_WIDTH = 360;
export const SIDEBAR_DEFAULT_WIDTH = 248;
export const SIDEBAR_COLLAPSE_SLOP = 56;
export const SIDEBAR_KEYBOARD_SHORTCUT = '[';
export const SIDEBAR_PEEK_OPEN_MS = 80;
export const SIDEBAR_PEEK_CLOSE_MS = 220;

function erDesktop(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
}

function lesCookie(navn: string): string | null {
  if (typeof document === 'undefined') return null;
  const treff = document.cookie.match(new RegExp(`(?:^|; )${navn}=([^;]*)`));
  return treff?.[1] ? decodeURIComponent(treff[1]) : null;
}

function skrivDesktopCookie(navn: string, verdi: string) {
  if (!erDesktop()) return;
  document.cookie = `${navn}=${encodeURIComponent(verdi)}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; SameSite=Lax`;
}

function lesOpenFraCookie(): boolean {
  const verdi = lesCookie(SIDEBAR_COOKIE_NAME);
  if (verdi === 'false' || verdi === 'closed') return false;
  return true;
}

function lesWidthFraCookie(): number {
  const verdi = Number(lesCookie(SIDEBAR_WIDTH_COOKIE));
  if (!Number.isFinite(verdi)) return SIDEBAR_DEFAULT_WIDTH;
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(verdi)));
}

type SidebarState = {
  /** Desktop: expanded. Telefon bruker `phoneOpen`. */
  open: boolean;
  setOpen: (neste: boolean | ((forrige: boolean) => boolean)) => void;
  toggle: () => void;
  /** Alias: desktop offcanvas er lukket. Aldri ikon-skinne. */
  collapsed: boolean;
  width: number;
  setWidth: (px: number) => void;
  phoneOpen: boolean;
  openPhone: () => void;
  closePhone: () => void;
  isPeeking: boolean;
  setIsPeeking: (neste: boolean | ((forrige: boolean) => boolean)) => void;
  schedulePeek: () => void;
  cancelPeek: () => void;
  scheduleUnpeek: () => void;
};

const Ctx = createContext<SidebarState>({
  open: true,
  setOpen: () => {},
  toggle: () => {},
  collapsed: false,
  width: SIDEBAR_DEFAULT_WIDTH,
  setWidth: () => {},
  phoneOpen: false,
  openPhone: () => {},
  closePhone: () => {},
  isPeeking: false,
  setIsPeeking: () => {},
  schedulePeek: () => {},
  cancelPeek: () => {},
  scheduleUnpeek: () => {},
});

export function SidebarStateProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(true);
  const [width, setWidthState] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [isPeeking, setIsPeeking] = useState(false);
  const hydrert = useRef(false);
  const peekTimer = useRef<number | null>(null);

  useEffect(() => {
    if (hydrert.current) return;
    hydrert.current = true;
    if (!erDesktop()) return;
    setOpenState(lesOpenFraCookie());
    setWidthState(lesWidthFraCookie());
  }, []);

  const clearPeekTimer = useCallback(() => {
    if (peekTimer.current != null) {
      window.clearTimeout(peekTimer.current);
      peekTimer.current = null;
    }
  }, []);

  const setOpen = useCallback(
    (neste: boolean | ((forrige: boolean) => boolean)) => {
      setOpenState((forrige) => {
        const verdi = typeof neste === 'function' ? neste(forrige) : neste;
        skrivDesktopCookie(SIDEBAR_COOKIE_NAME, verdi ? 'true' : 'false');
        if (verdi) setIsPeeking(false);
        return verdi;
      });
    },
    [],
  );

  const setWidth = useCallback((px: number) => {
    const klemt = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(px)));
    setWidthState(klemt);
    skrivDesktopCookie(SIDEBAR_WIDTH_COOKIE, String(klemt));
  }, []);

  const toggle = useCallback(() => {
    if (!erDesktop()) {
      setPhoneOpen((v) => !v);
      return;
    }
    setOpen((v) => !v);
  }, [setOpen]);

  const openPhone = useCallback(() => setPhoneOpen(true), []);
  const closePhone = useCallback(() => setPhoneOpen(false), []);

  const schedulePeek = useCallback(() => {
    if (open || !erDesktop()) return;
    clearPeekTimer();
    peekTimer.current = window.setTimeout(() => setIsPeeking(true), SIDEBAR_PEEK_OPEN_MS);
  }, [clearPeekTimer, open]);

  const scheduleUnpeek = useCallback(() => {
    if (open) return;
    clearPeekTimer();
    peekTimer.current = window.setTimeout(() => setIsPeeking(false), SIDEBAR_PEEK_CLOSE_MS);
  }, [clearPeekTimer, open]);

  const cancelPeek = useCallback(() => {
    clearPeekTimer();
  }, [clearPeekTimer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== SIDEBAR_KEYBOARD_SHORTCUT) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t instanceof HTMLElement) {
        const tag = t.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable) {
          return;
        }
      }
      if (!erDesktop()) return;
      e.preventDefault();
      setOpen((v) => !v);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [setOpen]);

  useEffect(() => () => clearPeekTimer(), [clearPeekTimer]);

  const value = useMemo(
    () => ({
      open,
      setOpen,
      toggle,
      collapsed: !open,
      width,
      setWidth,
      phoneOpen,
      openPhone,
      closePhone,
      isPeeking,
      setIsPeeking,
      schedulePeek,
      cancelPeek,
      scheduleUnpeek,
    }),
    [
      open,
      setOpen,
      toggle,
      width,
      setWidth,
      phoneOpen,
      openPhone,
      closePhone,
      isPeeking,
      schedulePeek,
      cancelPeek,
      scheduleUnpeek,
    ],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSidebarState(): SidebarState {
  return useContext(Ctx);
}
