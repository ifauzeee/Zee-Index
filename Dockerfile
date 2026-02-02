# ==============================================================================
# ZEE-INDEX DOCKERFILE
# Multi-stage optimized build with health checks and security best practices
# ==============================================================================

# Stage 1: Dependencies
# Install only production dependencies first for better layer caching
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install pnpm and dependencies
RUN --mount=type=cache,id=pnpm,target=/root/.pnpm-store \
    npm install -g pnpm && \
    pnpm config set store-dir /root/.pnpm-store && \
    pnpm i --frozen-lockfile

# Stage 2: Builder
# Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Install pnpm for build
RUN npm install -g pnpm

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build arguments for public environment variables
ARG NEXT_PUBLIC_ROOT_FOLDER_ID
ARG NEXT_PUBLIC_ROOT_FOLDER_NAME
ARG NEXT_PUBLIC_SENTRY_DSN

# Set environment variables for build
ENV NEXT_PUBLIC_ROOT_FOLDER_ID=$NEXT_PUBLIC_ROOT_FOLDER_ID
ENV NEXT_PUBLIC_ROOT_FOLDER_NAME=$NEXT_PUBLIC_ROOT_FOLDER_NAME
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV SKIP_ENV_VALIDATION=1

# Build the application
RUN --mount=type=cache,id=nextjs,target=/app/.next/cache \
    pnpm run build

# Stage 3: Runner
# Production runtime with minimal footprint
FROM node:20-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Install curl for health checks and dumb-init for proper signal handling
RUN apk add --no-cache curl dumb-init

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Set ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set runtime environment
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]