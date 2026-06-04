import path from "path";
import { promises as fs } from "fs";
import { NextRequest } from "next/server";
import { getAgentDir } from "@/lib/agent-dir";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IGNORE = new Set([".git", ".gitagent", "node_modules", ".DS_Store"]);
const MAX_FILE_BYTES = 200_000;

interface TreeNode {
  name: string;
  path: string; // relative to agent/
  type: "dir" | "file";
  children?: TreeNode[];
}

async function buildTree(absDir: string, rel: string): Promise<TreeNode[]> {
  const entries = await fs.readdir(absDir, { withFileTypes: true }).catch(() => []);
  const nodes: TreeNode[] = [];
  for (const e of entries) {
    if (IGNORE.has(e.name)) continue;
    const relPath = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      nodes.push({ name: e.name, path: relPath, type: "dir", children: await buildTree(path.join(absDir, e.name), relPath) });
    } else {
      nodes.push({ name: e.name, path: relPath, type: "file" });
    }
  }
  // Directories first, then files, alphabetical within each.
  return nodes.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
}

// Resolve a requested relative path safely inside the agent dir (no traversal).
function safeResolve(agentDir: string, rel: string): string | null {
  const abs = path.resolve(agentDir, rel);
  if (abs !== agentDir && !abs.startsWith(agentDir + path.sep)) return null;
  return abs;
}

export async function GET(req: NextRequest) {
  const agentDir = await getAgentDir();
  const rel = req.nextUrl.searchParams.get("path");

  if (!rel) {
    const tree = await buildTree(agentDir, "");
    return Response.json({ root: "agent", tree });
  }

  const abs = safeResolve(agentDir, rel);
  if (!abs) return Response.json({ error: "Invalid path" }, { status: 400 });

  try {
    const stat = await fs.stat(abs);
    if (stat.isDirectory()) return Response.json({ error: "Path is a directory" }, { status: 400 });
    if (stat.size > MAX_FILE_BYTES) return Response.json({ error: "File too large" }, { status: 413 });
    const content = await fs.readFile(abs, "utf8");
    return Response.json({ path: rel, content, size: stat.size });
  } catch {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
}
