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
    ],
    // RLS-testene deler DB-tilstand — serielt, ikke parallelt.
    fileParallelism: false,
  },
});
