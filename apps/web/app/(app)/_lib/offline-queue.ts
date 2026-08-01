'use client';

/**
 * F7-07 — Offline-kø for statusendringer. Mister mekanikeren dekning midt i en
 * jobb, skal «Ferdig» ikke bare feile — den legges i kø og sendes når nettet er
 * tilbake. Bevisst enkel: i minnet (tømmes ved full reload — dokumentert), én
 * kø for booking-overganger. Nok til kjeller-uten-dekning-tilfellet.
 */
export interface PendingTransition {
  bookingId: string;
  to: 'in_progress' | 'completed';
}

let queue: PendingTransition[] = [];
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

export function enqueueTransition(item: PendingTransition): void {
  // Samme booking i kø flere ganger? Behold kun siste ønskede tilstand.
  queue = queue.filter((q) => q.bookingId !== item.bookingId);
  queue.push(item);
  notify();
}

export function pendingCount(): number {
  return queue.length;
}

export function subscribeQueue(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Send køen. `exec` gjør det faktiske kallet (tRPC-mutasjonen). Feiler et element,
 * legges det tilbake i kø for neste forsøk (f.eks. neste «online»-event).
 */
export async function flushTransitions(
  exec: (item: PendingTransition) => Promise<void>,
): Promise<void> {
  const items = queue;
  queue = [];
  notify();
  for (const it of items) {
    try {
      await exec(it);
    } catch {
      queue.push(it);
      notify();
    }
  }
}
