# ==============================================================================
# ZEE-INDEX DOCKERFILE - ROBUST
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

RUN apk add --no-cache curl dumb-init openssl

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Also copy Prisma CLI and engines for the entrypoint
# We copy from the builder's node_modules/.pnpm to avoid hardcoding versions
# BUT, pnpm structure is complex. Simplest is to copy the binary and CLI.
COPY --from=builder /app/node_modules ./node_modules

# Script to run migrations and start
RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
    echo 'echo "Running database migrations..."' >> /app/entrypoint.sh && \
    echo 'npx prisma db push --accept-data-loss || echo "Prisma push failed, continuing..."' >> /app/entrypoint.sh && \
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