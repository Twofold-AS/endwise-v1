import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Booking-testene deler DB-tilstand (samme mekaniker, samme slot). Serielt.
    fileParallelism: false,
  },
});
