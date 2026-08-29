-- AlterTable: YearGroupMembership - moderation flags (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'YearGroupMembership' AND column_name = 'banned') THEN
    ALTER TABLE "YearGroupMembership" ADD COLUMN "banned" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'YearGroupMembership' AND column_name = 'restricted') THEN
    ALTER TABLE "YearGroupMembership" ADD COLUMN "restricted" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END
$$;

-- CreateTable: YearGroupPost
CREATE TABLE IF NOT EXISTS "YearGroupPost" (
    "id" TEXT NOT NULL,
    "yearGroupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "YearGroupPost_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'YearGroupPost_yearGroupId_createdAt_idx') THEN
    CREATE INDEX "YearGroupPost_yearGroupId_createdAt_idx" ON "YearGroupPost"("yearGroupId", "createdAt");
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'YearGroupPost_yearGroupId_fkey') THEN
    ALTER TABLE "YearGroupPost" ADD CONSTRAINT "YearGroupPost_yearGroupId_fkey" FOREIGN KEY ("yearGroupId") REFERENCES "YearGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'YearGroupPost_userId_fkey') THEN
    ALTER TABLE "YearGroupPost" ADD CONSTRAINT "YearGroupPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- CreateTable: YearGroupPostLike
CREATE TABLE IF NOT EXISTS "YearGroupPostLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "YearGroupPostLike_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'YearGroupPostLike_postId_userId_key') THEN
    CREATE UNIQUE INDEX "YearGroupPostLike_postId_userId_key" ON "YearGroupPostLike"("postId", "userId");
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'YearGroupPostLike_postId_fkey') THEN
    ALTER TABLE "YearGroupPostLike" ADD CONSTRAINT "YearGroupPostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "YearGroupPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'YearGroupPostLike_userId_fkey') THEN
    ALTER TABLE "YearGroupPostLike" ADD CONSTRAINT "YearGroupPostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- CreateTable: YearGroupPostComment
CREATE TABLE IF NOT EXISTS "YearGroupPostComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "YearGroupPostComment_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'YearGroupPostComment_postId_createdAt_idx') THEN
    CREATE INDEX "YearGroupPostComment_postId_createdAt_idx" ON "YearGroupPostComment"("postId", "createdAt");
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'YearGroupPostComment_postId_fkey') THEN
    ALTER TABLE "YearGroupPostComment" ADD CONSTRAINT "YearGroupPostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "YearGroupPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'YearGroupPostComment_userId_fkey') THEN
    ALTER TABLE "YearGroupPostComment" ADD CONSTRAINT "YearGroupPostComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
