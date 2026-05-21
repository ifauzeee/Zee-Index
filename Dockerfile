# Stage 1: Base
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
WORKDIR /app

# Stage 2: Dependencies
FROM base AS deps
COPY pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch
COPY package.json ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --offline --frozen-lockfile

# Stage 3: Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules

# Optimization: Copy prisma and package.json first to cache generation if schema hasn't changed
COPY package.json ./
COPY prisma ./prisma
RUN pnpm prisma generate

# Copy the rest of the application
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1

# Build application with Next.js cache mount
ARG NEXT_PUBLIC_ROOT_FOLDER_ID
ARG NEXT_PUBLIC_ROOT_FOLDER_NAME
ARG NEXT_PUBLIC_ENABLE_LOCAL_STORAGE
ARG NEXT_PUBLIC_LOCAL_STORAGE_NAME
ENV NEXT_PUBLIC_ROOT_FOLDER_ID=$NEXT_PUBLIC_ROOT_FOLDER_ID
ENV NEXT_PUBLIC_ROOT_FOLDER_NAME=$NEXT_PUBLIC_ROOT_FOLDER_NAME
ENV NEXT_PUBLIC_ENABLE_LOCAL_STORAGE=$NEXT_PUBLIC_ENABLE_LOCAL_STORAGE
ENV NEXT_PUBLIC_LOCAL_STORAGE_NAME=$NEXT_PUBLIC_LOCAL_STORAGE_NAME

RUN --mount=type=cache,target=/app/.next/cache pnpm run build

# Stage 4: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

RUN apk add --no-cache curl dumb-init openssl postgresql-client

# Install prisma CLI specifically for migrations in entrypoint (much smaller than full node_modules)
RUN npm install -g prisma@5.22.0

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Note: Standalone mode already includes necessary node_modules in .next/standalone/node_modules
# We no longer need to copy the entire /app/node_modules from builder.

# Script to run migrations and start
RUN cat <<'ENTRY' > /app/entrypoint.sh
#!/bin/sh
set -e
if [ -n "$DATABASE_URL" ]; then
  echo "Checking database existence..."
  DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\).*/\1/p' | cut -d/ -f1)
  DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\).*/\1/p')
  DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p' | rev | cut -d/ -f1 | rev)
  DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\([^@]*\)@.*/\1/p')

  echo "Waiting for postgres to be ready..."
  until PGPASSWORD=$DB_PASS psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c '\q' 2>/dev/null; do sleep 1; done

  echo "Ensuring database $DB_NAME exists..."
  DB_EXISTS=$(PGPASSWORD=$DB_PASS psql -h "$DB_HOST" -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" 2>/dev/null || echo "0")
  if [ "$DB_EXISTS" != "1" ]; then
    echo "Creating database $DB_NAME..."
    PGPASSWORD=$DB_PASS psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$DB_NAME\"" || echo "Database may already exist"
  fi
fi
echo "Running database migrations..."
# Use global prisma installed earlier
if [ -d "prisma/migrations" ]; then prisma migrate deploy; else prisma db push --accept-data-loss; fi || echo "Prisma migration failed, continuing..."
exec "$@"
ENTRY
RUN tr -d '\r' < /app/entrypoint.sh > /app/entrypoint.sh.fixed && \
    mv /app/entrypoint.sh.fixed /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=180s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

ENTRYPOINT ["dumb-init", "--", "/app/entrypoint.sh"]
CMD ["node", "server.js"]