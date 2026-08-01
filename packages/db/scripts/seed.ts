// Flyttet til apps/api/scripts/seed.ts (packages/db kan ikke avhenge av
// @endwise/auth — det ville lagd en syklus db→auth→db). Kjør `pnpm db:seed`.
export {};
