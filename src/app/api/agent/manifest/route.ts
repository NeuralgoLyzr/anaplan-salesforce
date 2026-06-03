import path from "path";
import { promises as fs } from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AGENT_DIR = path.join(process.cwd(), "agent");

// Pull `name` and `description` out of a SKILL.md YAML frontmatter block.
function parseFrontmatter(md: string): { name?: string; description?: string } {
  const m = md.match(/^---\s*([\s\S]*?)\s*---/);
  if (!m) return {};
  const out: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].replace(/^["']|["']$/g, "").trim();
  }
  return out;
}

async function listSkills() {
  const dir = path.join(AGENT_DIR, "skills");
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const skills = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const skillPath = path.join(dir, e.name, "SKILL.md");
    const md = await fs.readFile(skillPath, "utf8").catch(() => "");
    const fm = parseFrontmatter(md);
    skills.push({ id: e.name, name: fm.name ?? e.name, description: fm.description ?? "" });
  }
  return skills;
}

async function listKnowledge() {
  const dir = path.join(AGENT_DIR, "knowledge");
  const files = await fs.readdir(dir).catch(() => []);
  return files.filter((f) => f.endsWith(".md")).sort();
}

export async function GET() {
  const [skills, knowledge] = await Promise.all([listSkills(), listKnowledge()]);
  return Response.json({ skills, knowledge });
}
