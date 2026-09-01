-- AlterTable
ALTER TABLE "Message" ADD COLUMN "reactions" JSONB;
ALTER TABLE "Message" ADD COLUMN "replyToId" TEXT;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
