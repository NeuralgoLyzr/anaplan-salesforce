#!/usr/bin/env node
// Background worker for the Revenue Recognition app. Two interleaved jobs:
//
//   1. drive-all (fast, every 5s): advance every in-flight Session by one
//      drive() loop on the Next.js side. Without this, the pipeline only moves
//      when a user has the customer detail page open (which polls every 1s).
//
//   2. salesforce/sync (slow, every 20s): pull new Salesforce contracts via
//      the FastAPI gateway and create Sessions for any we haven't seen.
//
// Locally: `npm run worker` in a third terminal alongside `next dev` and the
// FastAPI backend. In prod: built into the rpt-worker Docker image (see
// worker.Dockerfile), deployed as an ECS Fargate service with `SYNC_URL_BASE`
// + `SALESFORCE_SYNC_SECRET` from Secrets Manager.

const BASE = process.env.SYNC_URL_BASE ?? "http://localhost:3002";
const DRIVE_URL = `${BASE}/api/companies/drive-all`;
const SYNC_URL = `${BASE}/api/salesforce/sync`;
const SECRET = process.env.SALESFORCE_SYNC_SECRET;
const DRIVE_INTERVAL_MS = Number(process.env.DRIVE_INTERVAL_MS ?? 5_000);
// Salesforce sync is expensive (multiple SOQL queries + document downloads),
// so we don't run it on the same cadence as drive-all. New contracts being
// picked up within a few minutes is fine; the pipeline keeps moving for
// already-ingested ones via drive-all every 5 seconds.
const SYNC_INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS ?? 300_000);
// Max time we'll wait for in-flight ticks to drain on SIGTERM before forcing
// exit. ECS gives the container `stopTimeout` seconds (default 30, max 120)
// after SIGTERM before SIGKILL; this should be less than that.
const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS ?? 20_000);

if (!SECRET) {
  console.error("SALESFORCE_SYNC_SECRET is not set. Aborting.");
  process.exit(1);
}

// Track in-flight ticks per job so we don't pile up overlapping requests when
// the server is slow (first-run bulk ingest can take ~90s).
const inFlight = { drive: false, sync: false };
let shuttingDown = false;
let driveTimer = null;
let syncTimer = null;

async function postWithBearer(url) {
  return fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${SECRET}` },
  });
}

async function driveTick() {
  if (shuttingDown || inFlight.drive) return;
  inFlight.drive = true;
  const started = Date.now();
  try {
    const res = await postWithBearer(DRIVE_URL);
    const text = await res.text();
    const stamp = new Date().toISOString();
    if (!res.ok) {
      console.error(`[${stamp}] drive ${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
      return;
    }
    let body;
    try { body = JSON.parse(text); } catch { body = null; }
    if (body && (body.busy > 0 || body.errors > 0)) {
      console.log(`[${stamp}] drive busy=${body.busy} advanced=${body.advanced} errors=${body.errors} (${Date.now() - started}ms)`);
    }
    // Silent when there's nothing to do — keeps the log clean.
  } catch (e) {
    const hint = e.cause?.code === "ECONNREFUSED"
      ? `  ↪ no server on ${DRIVE_URL}. Is \`next dev\` running? Set SYNC_URL_BASE if it's on a different port.`
      : "";
    console.error(`[${new Date().toISOString()}] drive tick failed: ${e.message}${hint ? "\n" + hint : ""}`);
  } finally {
    inFlight.drive = false;
  }
}

async function syncTick() {
  if (shuttingDown || inFlight.sync) return;
  inFlight.sync = true;
  const started = Date.now();
  try {
    const res = await postWithBearer(SYNC_URL);
    const text = await res.text();
    const stamp = new Date().toISOString();
    if (!res.ok) {
      console.error(`[${stamp}] sync ${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
      return;
    }
    let body;
    try { body = JSON.parse(text); } catch { body = null; }
    if (body && (body.ingested > 0 || (body.errors ?? []).length > 0)) {
      console.log(`[${stamp}] sync pulled=${body.pulled} ingested=${body.ingested} skipped=${body.skipped} errors=${(body.errors ?? []).length} (${Date.now() - started}ms)`);
    }
  } catch (e) {
    const hint = e.cause?.code === "ECONNREFUSED"
      ? `  ↪ no server on ${SYNC_URL}. Is \`next dev\` running? Set SYNC_URL_BASE if it's on a different port.`
      : "";
    console.error(`[${new Date().toISOString()}] sync tick failed: ${e.message}${hint ? "\n" + hint : ""}`);
  } finally {
    inFlight.sync = false;
  }
}

// Graceful shutdown: clear the timers, wait for any tick already mid-flight
// to finish, then exit. ECS sends SIGTERM on stop/redeploy; without this we
// could leave a Lyzr submission half-done.
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[${new Date().toISOString()}] received ${signal}, draining (max ${SHUTDOWN_TIMEOUT_MS}ms)...`);
  if (driveTimer) clearInterval(driveTimer);
  if (syncTimer) clearInterval(syncTimer);

  const deadline = Date.now() + SHUTDOWN_TIMEOUT_MS;
  while ((inFlight.drive || inFlight.sync) && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 100));
  }
  if (inFlight.drive || inFlight.sync) {
    console.warn(`[${new Date().toISOString()}] drain timeout (drive=${inFlight.drive} sync=${inFlight.sync}); exiting anyway`);
  } else {
    console.log(`[${new Date().toISOString()}] clean shutdown`);
  }
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

console.log(`Background worker → ${BASE}`);
console.log(`  drive-all every ${DRIVE_INTERVAL_MS}ms`);
console.log(`  salesforce/sync every ${SYNC_INTERVAL_MS}ms`);
console.log(`  shutdown drain max ${SHUTDOWN_TIMEOUT_MS}ms`);

// Kick off immediately, then on intervals. Sync first so a fresh start ingests
// before driving has anything to do.
syncTick();
driveTick();
driveTimer = setInterval(driveTick, DRIVE_INTERVAL_MS);
syncTimer = setInterval(syncTick, SYNC_INTERVAL_MS);
