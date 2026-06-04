import path from "path";
import os from "os";
import { promises as fs, existsSync } from "fs";

// The gitagent repo as bundled with the app.
const SOURCE = path.join(process.cwd(), "agent");
// A guaranteed-writable working copy for production (the bundle FS is read-only
// or unreliable; /tmp is always writable and the SDK writes its `.gitagent`).
const WORKDIR = path.join(os.tmpdir(), "revrec-agent");

// Returns a usable, writable agent directory.
//  - Development: use the source dir directly (live edits, no copy).
//  - Production (serverless): keep a complete, writable copy in /tmp and make
//    sure both the dir AND the SDK's `.gitagent` state dir exist, so a bare
//    mkdir inside the SDK can never ENOENT on a missing parent.
export async function getAgentDir(): Promise<string> {
  if (process.env.NODE_ENV !== "production") return SOURCE;

  // (Re)create a complete copy if the sentinel file is missing (covers a never-
  // copied dir and a partial/interrupted previous copy).
  const sentinel = path.join(WORKDIR, "agent.yaml");
  if (!existsSync(sentinel)) {
    await fs.rm(WORKDIR, { recursive: true, force: true }).catch(() => {});
    await fs.cp(SOURCE, WORKDIR, { recursive: true });
  }

  // Pre-create the SDK's state dir (recursive mkdir is idempotent and also
  // guarantees WORKDIR itself exists). The SDK tolerates an existing .gitagent.
  await fs.mkdir(path.join(WORKDIR, ".gitagent"), { recursive: true }).catch(() => {});

  return WORKDIR;
}
