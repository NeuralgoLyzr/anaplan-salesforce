# ─────────────────────────────────────────────────────────────────────────────
# Anaplan Rev-Rec — Next.js 15 Frontend  (standalone output mode)
#
# Uses Next.js `output: "standalone"` so only the node_modules that are
# actually imported at runtime are bundled — image ~500 MB vs ~3.7 GB.
#
# Build (BuildKit required for cache mounts — ~2 min on repeat builds):
#   DOCKER_BUILDKIT=1 docker build -t anaplan-revrec:latest .
#
# Run (secrets injected at runtime — NEVER baked into the image):
#   docker run --rm -p 3000:3000 --env-file .env.local anaplan-revrec:latest
# ─────────────────────────────────────────────────────────────────────────────

# Enable BuildKit inline syntax
# syntax=docker/dockerfile:1

# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:22-alpine AS deps

# Cache the apk index between builds — avoids re-downloading on every build
RUN --mount=type=cache,target=/var/cache/apk \
    apk add --update-cache libc6-compat

WORKDIR /app

# Copy lock files first — maximises Docker layer cache hits
COPY package.json package-lock.json ./

# Cache ~/.npm between builds — only re-downloads packages that changed
RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts

# ── Stage 2: build the Next.js app ───────────────────────────────────────────
FROM node:22-alpine AS builder

# git is required by gitagent at build time
RUN --mount=type=cache,target=/var/cache/apk \
    apk add --update-cache libc6-compat git

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env: only non-secret values needed to compile.
# Secret env vars (API keys, DB URIs) are injected at container start.
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN --mount=type=cache,target=/root/.npm \
    npm run build

# ── Stage 3: minimal production runner ───────────────────────────────────────
FROM node:22-alpine AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# ── Standalone output: only what Next.js needs to serve ─────────────────────
# .next/standalone  → self-contained server.js + minimal node_modules
# .next/static      → hashed client assets (CSS, JS chunks)
# public/           → static files served directly

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public           ./public

# The gitagent SDK reads the agent/ directory at runtime via fs.
# outputFileTracingIncludes in next.config.ts traces it into standalone,
# but we copy it explicitly as a safety net.
COPY --from=builder --chown=nextjs:nodejs /app/agent ./agent

USER nextjs

EXPOSE 3000

# Use standalone server.js — no npm, no node_modules in PATH needed
CMD ["node", "server.js"]
