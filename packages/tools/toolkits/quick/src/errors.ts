/**
 * Feiltyper for Quick-klienten. Egen leaf-modul (ingen importer) så
 * `client.ts` og `url-guard.ts` kan dele dem uten sirkulær avhengighet.
 */
export class QuickError extends Error {
  // Eksplisitt felt (ikke TS parameter property) — Node strip-only-trygt.
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

/** 401/403 = token/baseUrl feil. Egen type så «test tilkobling» kan skille auth fra nede. */
export class QuickAuthError extends QuickError {}

/** CWE-918 — baseUrl avvist av ssrf-vernet (ikke-tillatt host/skjema/port). */
export class QuickSsrfError extends QuickError {}
