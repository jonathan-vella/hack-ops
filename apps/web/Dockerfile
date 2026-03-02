# -----------------------------------------------------------------------
# HackOps Web — Multi-stage Docker build
# node:24-alpine matching engines >= 24.0.0 in package.json
# -----------------------------------------------------------------------

# ── Stage 1: Install dependencies (layer cache optimised) ─────────────
FROM node:24-alpine AS deps
WORKDIR /app

# Copy only package manifests for deterministic npm ci
COPY package.json package-lock.json turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci --ignore-scripts

# ── Stage 2: Build application ────────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

# Copy workspace-local node_modules if they exist (npm workspaces hoists most
# dependencies to root, but workspace symlinks may live here)
COPY --from=deps /app/apps/web/package.json ./apps/web/package.json

# Copy full source
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build --workspace @hackops/web

# ── Stage 3: Production runtime ───────────────────────────────────────
FROM node:24-alpine AS runtime
WORKDIR /app

# Non-root user (P18)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone server output
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./

# Copy static assets to the correct nested path
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# Copy public directory if it exists (conditional via shell)
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

ENV PORT=8080
ENV HOSTNAME=0.0.0.0
EXPOSE 8080

USER nextjs

CMD ["node", "apps/web/server.js"]
