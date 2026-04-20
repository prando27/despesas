-- CreateTable
CREATE TABLE "entries" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'EXPENSE',
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "receipt_url" TEXT,
    "created_by_id" TEXT NOT NULL,
    "to_user_id" TEXT,
    "group_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "entries_type_check" CHECK ("type" IN ('EXPENSE', 'TRANSFER'))
);

-- CreateTable
CREATE TABLE "entry_items" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "entry_id" TEXT NOT NULL,

    CONSTRAINT "entry_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "entries_date_idx" ON "entries"("date");

-- CreateIndex
CREATE INDEX "entries_created_by_id_idx" ON "entries"("created_by_id");

-- CreateIndex
CREATE INDEX "entries_group_id_idx" ON "entries"("group_id");

-- CreateIndex
CREATE INDEX "entry_items_entry_id_idx" ON "entry_items"("entry_id");

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entry_items" ADD CONSTRAINT "entry_items_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
