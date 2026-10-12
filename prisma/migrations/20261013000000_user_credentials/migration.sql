-- AlterTable: move password hashes and TOTP state from Redis to Postgres (audit Z2-02)
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT,
ADD COLUMN "twoFactorSecret" TEXT,
ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "credentialsMigratedAt" TIMESTAMP(3);
