import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Eksplisitt liste, ikke glob: booking-engine.test.ts er FLYTTET til
    // packages/modules (der motoren bor). Fila her er en rest som skal slettes.
    include: [
      'test/crypto.test.ts',
      'test/tenant-isolation.test.ts',
      'test/f2-isolation.test.ts',
      'test/quick-isolation.test.ts',
      'test/widget-isolation.test.ts',
      // F5-28 — verifiserer at RLS i det hele tatt gjelder for runtime-rollen.
      'test/force-rls.test.ts',
      // F2-09 — tenant-isolasjon på lageret (deler, beholdning, bevegelser).
      'test/inventory-isolation.test.ts',
      // F1-11/F1-12 — opprydding av døde sesjonsrader (og at levende overlever).
      'test/session-purge.test.ts',
      // F1-11 — angrepstest: pre-2FA-sesjoner river seg selv ved påslag,
      // også når 2FA settes med rå SQL utenom applikasjonen.
      'test/2fa-session-cutoff.test.ts',
    ],
    // RLS-testene deler DB-tilstand — serielt, ikke parallelt.
    fileParallelism: false,
  },
});
