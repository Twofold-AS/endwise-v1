import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Eksplisitt liste, ikke glob: booking-engine.test.ts er flyttet til
    // packages/modules (der motoren bor). Fila her er en rest som skal slettes.
    include: [
      'test/crypto.test.ts',
      // Vercel/Scaleway TLS: sslmode=require vs. egen ca.
      'test/pg-ssl.test.ts',
      'test/pgbouncer.test.ts',
      'test/tenant-isolation.test.ts',
      'test/f2-isolation.test.ts',
      'test/quick-isolation.test.ts',
      'test/widget-isolation.test.ts',
      // Verifiserer at RLS i det hele tatt gjelder for runtime-rollen.
      'test/force-rls.test.ts',
      // Tenant-isolasjon på lageret (deler, beholdning, bevegelser).
      'test/inventory-isolation.test.ts',
      // F1-11/F1-12 — opprydding av døde sesjonsrader (og at levende overlever).
      'test/session-purge.test.ts',
      // Angrepstest: pre-2FA-sesjoner river seg selv ved påslag,
      // også når 2FA settes med rå SQL utenom applikasjonen.
      'test/2fa-session-cutoff.test.ts',
      // Mons P0 — inspect-guc, 0021, hash-policy, eier-trigger.
      'test/mons-p0-kontrakt.test.ts',
      'test/platform-inspect.test.ts',
      // F3-09 / P3 — booking_services RLS + backfill-kontrakt.
      'test/booking-services-kontrakt.test.ts',
      'test/dealer-profile-kontrakt.test.ts',
      // F1-14 — setFunction-hull: mechanics-rad for job_function=mekaniker.
      'test/mekaniker-backfill-kontrakt.test.ts',
    ],
    // RLS-testene deler DB-tilstand — serielt, ikke parallelt.
    fileParallelism: false,
  },
});
