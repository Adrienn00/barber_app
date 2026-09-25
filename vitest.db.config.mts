import { defineConfig } from "vitest/config";

// Adatbázis-tesztek a helyi Supabase ellen (npm run test:db). Előfeltétel: npm run db:start.
export default defineConfig({
  test: {
    include: ["tests/db/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/db/global-setup.ts"],
    // Közös adatbázison dolgoznak, ezért sorban futnak
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
