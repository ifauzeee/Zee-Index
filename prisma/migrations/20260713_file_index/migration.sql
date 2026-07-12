-- CreateTable
CREATE TABLE "FileIndex" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "size" INTEGER,
    "modifiedTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileIndex_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FileIndex_name_idx" ON "FileIndex"("name");

-- CreateIndex
CREATE INDEX "FileIndex_folderId_idx" ON "FileIndex"("folderId");

-- CreateIndex
CREATE INDEX "FileIndex_mimeType_idx" ON "FileIndex"("mimeType");
