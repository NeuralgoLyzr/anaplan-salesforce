import path from "path";
import os from "os";
import { promises as fs, constants as fsConstants, existsSync } from "fs";

// The gitagent repo as bundled with the app (read-only on serverless).
const SOURCE = path.join(process.cwd(), "agent");
// A writable working copy for serverless, where the bundle FS is read-only but
// /tmp is writable and the SDK needs to create its `.gitagent` state dir.
const WORKDIR = path.join(os.tmpdir(), "revrec-agent");

let cached: string | null = null;

// Returns a usable agent directory:
//  - Locally / when the source dir is writable, use it directly so edits to
//    skills/knowledge are live without a copy step.
//  - On a read-only serverless bundle (Amplify/Lambda), copy the bundled agent
//    repo into /tmp once and run from there so the SDK can write `.gitagent`.
export async function getAgentDir(): Promise<string> {
  if (cached && existsSync(cached)) return cached;

  // Prefer the source dir if we can write to it (local dev).
  try {
    await fs.access(SOURCE, fsConstants.W_OK);
    cached = SOURCE;
    return SOURCE;
  } catch {
    /* read-only — fall through to the tmp copy */
  }

  // Copy the bundled (read-only) agent repo to a writable tmp dir once.
  if (!existsSync(WORKDIR)) {
    await fs.cp(SOURCE, WORKDIR, { recursive: true });
  }
  cached = WORKDIR;
  return WORKDIR;
}
