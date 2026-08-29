-- AlterTable: YearGroupInvite - allow inviting by contact (email/phone) before registration
-- Drop the NOT NULL constraint on invitedUserId (idempotent)
ALTER TABLE "YearGroupInvite" ALTER COLUMN "invitedUserId" DROP NOT NULL;

-- Add new contact columns (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'YearGroupInvite' AND column_name = 'contactEmail') THEN
    ALTER TABLE "YearGroupInvite" ADD COLUMN "contactEmail" TEXT;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'YearGroupInvite' AND column_name = 'contactPhone') THEN
    ALTER TABLE "YearGroupInvite" ADD COLUMN "contactPhone" TEXT;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'YearGroupInvite' AND column_name = 'token') THEN
    ALTER TABLE "YearGroupInvite" ADD COLUMN "token" TEXT;
  END IF;
END
$$;

-- CreateIndex (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'YearGroupInvite_token_key') THEN
    CREATE UNIQUE INDEX "YearGroupInvite_token_key" ON "YearGroupInvite"("token");
  END IF;
END
$$;
