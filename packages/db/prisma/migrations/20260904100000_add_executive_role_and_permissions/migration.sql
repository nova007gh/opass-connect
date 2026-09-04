-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'EXECUTIVE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[];
