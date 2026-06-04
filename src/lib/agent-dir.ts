import path from "path";
import os from "os";
import { promises as fs, existsSync } from "fs";

// The gitagent repo as bundled with the app.
const SOURCE = path.join(process.cwd(), "agent");
// A guaranteed-writable working copy for production, where the bundle FS is
// read-only (or unreliably reports writability) but /tmp is always writable and
// the SDK needs to create its `.gitagent` state dir.
const WORKDIR = path.join(os.tmpdir(), "revrec-agent");

// Shared per-instance copy promise so concurrent requests don't race the copy.
let prep: Promise<string> | null = null;

// Returns a usable, writable agent directory:
//  - Development: use the source dir directly so edits to skills/knowledge are
//    live with no copy step.
//  - Production (serverless): always copy the bundled agent repo into /tmp once
//    and run from there. We do NOT probe writability of the source — on Amplify
//    fs.access(W_OK) can report the read-only bundle as writable, after which the
//    SDK's mkdir('.gitagent') fails with ENOENT.
export async function getAgentDir(): Promise<string> {
  if (process.env.NODE_ENV !== "production") return SOURCE;

  if (!prep) {
    prep = (async () => {
      if (!existsSync(WORKDIR)) {
        await fs.cp(SOURCE, WORKDIR, { recursive: true });
      }
      return WORKDIR;
    })();
  }
  return prep;
}
