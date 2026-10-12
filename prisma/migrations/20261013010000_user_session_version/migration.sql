-- AlterTable: revocable JWT sessions (audit Z2-06)
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
