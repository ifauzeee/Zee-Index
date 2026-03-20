# ==============================================================================
# ZEE-INDEX DOCKERFILE - PostgreSQL + Optimized Build
# ==============================================================================

# Stage 1: Base
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Stage 2: Dependencies
FROM base AS deps
COPY pnpm-lock.yaml ./
RUN pnpm fetch
COPY package.json ./
RUN pnpm install --offline --frozen-lockfile

# Stage 3: Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1

# Generate Prisma Client
RUN pnpm prisma generate

# Build application
ARG NEXT_PUBLIC_ROOT_FOLDER_ID
ARG NEXT_PUBLIC_ROOT_FOLDER_NAME
ENV NEXT_PUBLIC_ROOT_FOLDER_ID=$NEXT_PUBLIC_ROOT_FOLDER_ID
ENV NEXT_PUBLIC_ROOT_FOLDER_NAME=$NEXT_PUBLIC_ROOT_FOLDER_NAME

RUN pnpm run build

# Stage 4: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

RUN apk add --no-cache curl dumb-init openssl postgresql-client

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copy node_modules (needed for Prisma CLI and client)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Script to run migrations and start
RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
    echo 'set -e' >> /app/entrypoint.sh && \
    echo 'if [ -n "$DATABASE_URL" ]; then' >> /app/entrypoint.sh && \
    echo '  echo "Checking database existence..."' >> /app/entrypoint.sh && \
    echo '  # Extract host, user, and db name from DATABASE_URL' >> /app/entrypoint.sh && \
    echo '  DB_HOST=$(echo $DATABASE_URL | sed -n "s/.*@\\([^:]*\\).*/\\1/p" | cut -d/ -f1)' >> /app/entrypoint.sh && \
    echo '  DB_USER=$(echo $DATABASE_URL | sed -n "s/.*\\/\\/\\([^:]*\\).*/\\1/p")' >> /app/entrypoint.sh && \
    echo '  DB_NAME=$(echo $DATABASE_URL | sed -n "s/.*\\/\\([^?]*\\).*/\\1/p" | rev | cut -d/ -f1 | rev)' >> /app/entrypoint.sh && \
    echo '  DB_PASS=$(echo $DATABASE_URL | sed -n "s/.*:\\([^@]*\\)@.*/\\1/p")' >> /app/entrypoint.sh && \
    echo '  ' >> /app/entrypoint.sh && \
    echo '  echo "Waiting for $DB_HOST to be ready..."' >> /app/entrypoint.sh && \
    echo '  until PGPASSWORD=$DB_PASS psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "\\q" 2>/dev/null; do sleep 1; done' >> /app/entrypoint.sh && \
    echo '  ' >> /app/entrypoint.sh && \
    echo '  echo "Ensuring database $DB_NAME exists..."' >> /app/entrypoint.sh && \
    echo '  PGPASSWORD=$DB_PASS psql -h "$DB_HOST" -U "$DB_USER" -d postgres -tc \"SELECT 1 FROM pg_database WHERE datname = \x27$DB_NAME\x27\" | grep -q 1 || \' >> /app/entrypoint.sh && \
    echo '    PGPASSWORD=$DB_PASS psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c \"CREATE DATABASE \\\"$DB_NAME\\\"\"' >> /app/entrypoint.sh && \
    echo 'fi' >> /app/entrypoint.sh && \
    echo 'echo "Running database migrations..."' >> /app/entrypoint.sh && \
    echo 'if [ -d "prisma/migrations" ]; then npx prisma migrate deploy; else npx prisma db push --accept-data-loss; fi || echo "Prisma migration failed, continuing..."' >> /app/entrypoint.sh && \
    echo 'exec "$@"' >> /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

ENTRYPOINT ["dumb-init", "--", "/app/entrypoint.sh"]
CMD ["node", "server.js"]