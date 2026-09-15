-- Replace B-tree contentText index with GIN trigram index for ILIKE '%q%' queries
-- Database: PostgreSQL 16

-- Enable pg_trgm extension (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Drop the B-tree index (useless for leading-wildcard ILIKE searches)
DROP INDEX IF EXISTS "FileIndex_contentText_idx";

-- GIN trigram index — supports ILIKE '%query%' via gin_trgm_ops
CREATE INDEX "FileIndex_contentText_trgm_idx" ON "FileIndex" USING gin ("contentText" gin_trgm_ops);