-- Durable folder ACL + share creator audit field

ALTER TABLE "ShareLink" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;

CREATE INDEX IF NOT EXISTS "ShareLink_createdBy_idx" ON "ShareLink"("createdBy");

CREATE TABLE IF NOT EXISTS "FolderAccess" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FolderAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FolderAccess_folderId_email_key" ON "FolderAccess"("folderId", "email");

CREATE INDEX IF NOT EXISTS "FolderAccess_email_idx" ON "FolderAccess"("email");

CREATE INDEX IF NOT EXISTS "FolderAccess_folderId_idx" ON "FolderAccess"("folderId");
