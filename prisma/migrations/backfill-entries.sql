-- Backfill idempotente de expenses/expense_items para entries/entry_items.
-- Pré-requisito: a migration `add_entries` já foi aplicada (tabelas novas existem).
-- Uso: rodar direto no DB de produção dentro de uma transação, com backup recente.
-- Preserva IDs cuid — receipt URLs (chaves S3) continuam válidas sem mover arquivos.

BEGIN;

-- 1. Backfill expenses -> entries (type=EXPENSE, toUserId=NULL)
INSERT INTO "entries" (id, type, description, date, receipt_url, created_by_id, group_id, created_at, to_user_id)
SELECT id, 'EXPENSE', description, date, receipt_url, created_by_id, group_id, created_at, NULL
FROM "expenses"
ON CONFLICT (id) DO NOTHING;

-- 2. Backfill expense_items -> entry_items
INSERT INTO "entry_items" (id, description, value, entry_id)
SELECT id, description, value, expense_id
FROM "expense_items"
ON CONFLICT (id) DO NOTHING;

-- 3. Validação: contagens devem bater
SELECT
  (SELECT COUNT(*) FROM expenses)                         AS expenses_count,
  (SELECT COUNT(*) FROM entries WHERE type='EXPENSE')     AS entries_expense_count,
  (SELECT COUNT(*) FROM expense_items)                    AS expense_items_count,
  (SELECT COUNT(*) FROM entry_items)                      AS entry_items_count;

-- 4. Validação: todo receipt_url de expense deve existir em entries com mesmo id
SELECT id, receipt_url FROM expenses WHERE receipt_url IS NOT NULL
EXCEPT
SELECT id, receipt_url FROM entries WHERE receipt_url IS NOT NULL;
-- (resultado vazio = receipts preservados)

-- Se as validações forem OK, executar:
-- COMMIT;
-- Caso contrário:
-- ROLLBACK;
