-- CreateTable
CREATE TABLE "expense_participants" (
    "id" TEXT NOT NULL,
    "expense_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "expense_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expense_participants_expense_id_idx" ON "expense_participants"("expense_id");

-- CreateIndex
CREATE UNIQUE INDEX "expense_participants_expense_id_user_id_key" ON "expense_participants"("expense_id", "user_id");

-- AddForeignKey
ALTER TABLE "expense_participants" ADD CONSTRAINT "expense_participants_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_participants" ADD CONSTRAINT "expense_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
