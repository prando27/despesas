-- Add optional discount column to entries. Default 0 keeps existing rows unchanged.
ALTER TABLE "entries" ADD COLUMN "discount" DECIMAL(10,2) NOT NULL DEFAULT 0;
