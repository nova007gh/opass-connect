-- AlterEnum (idempotent: IF NOT EXISTS supported in PostgreSQL 12+)
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SECURITY';

-- AlterTable (idempotent: only add column if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AIConversation' AND column_name = 'updatedAt') THEN
    ALTER TABLE "AIConversation" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF
END$$;

-- AlterTable (idempotent: only add column if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Business' AND column_name = 'location') THEN
    ALTER TABLE "Business" ADD COLUMN "location" TEXT;
  END IF
END$$;

-- AddForeignKey (idempotent: only add if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Candidate_userId_fkey') THEN
    ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF
END$$;
