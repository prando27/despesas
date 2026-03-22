-- AlterTable
ALTER TABLE "group_members" ADD COLUMN     "weight" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "group_type" TEXT NOT NULL DEFAULT 'monthly',
ADD COLUMN     "split_type" TEXT NOT NULL DEFAULT 'equal';
