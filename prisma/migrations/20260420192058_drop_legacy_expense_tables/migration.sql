-- Drop legacy tables replaced by `entries` / `entry_items`.
-- Data was backfilled in phase 1 (see prisma/migrations/backfill-entries.sql).
-- Take a backup before applying in production.

DROP TABLE "expense_items";
DROP TABLE "expenses";
DROP TABLE "month_payments";
