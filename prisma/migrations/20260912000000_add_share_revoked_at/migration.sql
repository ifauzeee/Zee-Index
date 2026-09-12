-- AlterTable: add revokedAt column to ShareLink for durable revocation
ALTER TABLE "ShareLink" ADD COLUMN "revokedAt" TIMESTAMP(3);