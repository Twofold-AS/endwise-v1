/** F6-02 — Heartbeat hvert 15. sekund (techstack §2 Sanntid). */
export const HEARTBEAT_MS = 15_000;

/**
 * Proxyer og lastbalansere kutter stille ledige forbindelser. Heartbeatet er
 * ikke bare et livstegn til klienten — det er det som hindrer at noen andre
 * bestemmer seg for at forbindelsen er død.
 */
export const MAX_STREAM_LIFETIME_MS = 30 * 60 * 1000;
