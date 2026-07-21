-- AlterTable: add contentText column to FileIndex for full-text search
ALTER TABLE "FileIndex" ADD COLUMN "contentText" TEXT;

-- CreateIndex for full-text search queries
CREATE INDEX "FileIndex_contentText_idx" ON "FileIndex"("contentText");
