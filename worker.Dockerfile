# Dockerfile for the rpt-worker ECS service.
#
# The worker has zero npm dependencies — it uses only built-in fetch +
# setInterval — so the image is essentially node:22-alpine + one .mjs file.
# Resulting image is ~50 MB compressed.
#
# Build (from the frontend repo root):
#   docker build -f worker.Dockerfile -t rpt-worker:latest .
#
# Run locally against `next dev` on host:
#   docker run --rm \
#     -e SYNC_URL_BASE=http://host.docker.internal:3002 \
#     -e SALESFORCE_SYNC_SECRET=<your-secret> \
#     rpt-worker:latest

FROM node:22-alpine

# Drop privileges. The `node` user is created by the official image.
USER node
WORKDIR /home/node/app

# Copy only the worker script — no node_modules, no Next.js code, nothing else.
COPY --chown=node:node scripts/worker.mjs ./scripts/worker.mjs

ENV NODE_ENV=production

# Defaults the worker reads via process.env. Override these in the ECS task
# definition for production; SALESFORCE_SYNC_SECRET and SYNC_URL_BASE MUST be
# provided at runtime (the worker exits if SALESFORCE_SYNC_SECRET is unset).
ENV DRIVE_INTERVAL_MS=5000 \
    SYNC_INTERVAL_MS=300000 \
    SHUTDOWN_TIMEOUT_MS=20000

# No ports to expose — the worker is outbound-only (it POSTs to the Next.js
# app and reads responses). Don't EXPOSE anything, don't add a HEALTHCHECK:
# ECS Fargate uses the container PID for liveness, which is exactly what we
# want for a long-running process with no HTTP listener.

CMD ["node", "scripts/worker.mjs"]
