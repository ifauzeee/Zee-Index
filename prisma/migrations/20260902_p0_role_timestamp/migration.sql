-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EDITOR', 'USER', 'GUEST');

-- AlterTable: User.role String -> enum Role
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING ("role"::"Role");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER'::"Role";

-- AlterTable: ActivityLog.timestamp Float -> DateTime TIMESTAMPTZ(6)
-- Existing data is Float (unix ms via Date.now()), convert via to_timestamp(seconds)
ALTER TABLE "ActivityLog" ALTER COLUMN "timestamp" TYPE TIMESTAMPTZ(6) USING to_timestamp("timestamp" / 1000.0);
ALTER TABLE "ActivityLog" ALTER COLUMN "timestamp" SET DEFAULT CURRENT_TIMESTAMP;
