-- CreateEnum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InviteStatus') THEN
    CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END
$$;

-- AlterTable: YearGroup - add galleryUrls, creatorId (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'YearGroup' AND column_name = 'galleryUrls') THEN
    ALTER TABLE "YearGroup" ADD COLUMN "galleryUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'YearGroup' AND column_name = 'creatorId') THEN
    ALTER TABLE "YearGroup" ADD COLUMN "creatorId" TEXT;
  END IF;
END
$$;

-- AddForeignKey: YearGroup.creatorId -> User.id (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'YearGroup_creatorId_fkey') THEN
    ALTER TABLE "YearGroup" ADD CONSTRAINT "YearGroup_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- CreateTable: YearGroupInvite (idempotent)
CREATE TABLE IF NOT EXISTS "YearGroupInvite" (
    "id" TEXT NOT NULL,
    "yearGroupId" TEXT NOT NULL,
    "invitedUserId" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "selfRequested" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YearGroupInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'YearGroupInvite_yearGroupId_invitedUserId_key') THEN
    CREATE UNIQUE INDEX "YearGroupInvite_yearGroupId_invitedUserId_key" ON "YearGroupInvite"("yearGroupId", "invitedUserId");
  END IF;
END
$$;

-- AddForeignKeys for YearGroupInvite (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'YearGroupInvite_yearGroupId_fkey') THEN
    ALTER TABLE "YearGroupInvite" ADD CONSTRAINT "YearGroupInvite_yearGroupId_fkey" FOREIGN KEY ("yearGroupId") REFERENCES "YearGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'YearGroupInvite_invitedUserId_fkey') THEN
    ALTER TABLE "YearGroupInvite" ADD CONSTRAINT "YearGroupInvite_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'YearGroupInvite_invitedByUserId_fkey') THEN
    ALTER TABLE "YearGroupInvite" ADD CONSTRAINT "YearGroupInvite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
