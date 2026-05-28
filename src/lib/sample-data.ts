import type { ActivityEvent } from "@/hooks/use-journey-stream";

function makeActivities(skill: string): ActivityEvent[] {
  const now = Date.now();
  const base: ActivityEvent[] = [
    { action: `Loading skill: ${skill}`, icon: "search", filePath: `skills/${skill}/SKILL.md`, ts: now },
    { action: `Reading SKILL.md frontmatter... confidence: 0.85`, icon: "book", filePath: `skills/${skill}/SKILL.md`, ts: now + 1200 },
    { action: "Reading SOUL.md", icon: "file", filePath: "SOUL.md", ts: now + 2700 },
    { action: "Reading RULES.md", icon: "file", filePath: "RULES.md", ts: now + 3200 },
    { action: "Loading knowledge: wtw overview", icon: "folder", filePath: "knowledge/docs/wtw-overview.md", ts: now + 4700 },
    { action: "Loading knowledge: industry benchmarks", icon: "folder", filePath: "knowledge/docs/industry-benchmarks.md", ts: now + 5700 },
    { action: "Loading knowledge: methodology discovery", icon: "folder", filePath: "knowledge/docs/methodology-discovery.md", ts: now + 6700 },
    { action: "Loading knowledge: methodology design", icon: "folder", filePath: "knowledge/docs/methodology-design.md", ts: now + 7700 },
  ];

  const lastTs = now + 7700;
  return [
    ...base,
    { action: `Analyzing ${skill.replace(/-/g, " ")} inputs...`, icon: "brain", ts: lastTs + 1000 },
    { action: "Sending context to Claude Sonnet 4 for analysis...", icon: "cpu", ts: lastTs + 2800 },
    { action: "Generating deliverable...", icon: "cpu", ts: lastTs + 3800 },
    {
      action: `Saved to workspace/meridian-manufacturing/meridian-manufacturing-employee-benefits-survey.md`,
      icon: "save",
      filePath: `workspace/meridian-manufacturing/meridian-manufacturing-employee-benefits-survey.md`,
      ts: lastTs + 5000,
    },
  ];
}

export async function loadSampleOutput(skill: string): Promise<{ activities: ActivityEvent[]; output: string }> {
  const fileMap: Record<string, string> = {
    "survey-designer": "meridian-manufacturing-employee-benefits-survey.md",
  };
  const fileName = fileMap[skill];
  if (!fileName) return { activities: [], output: "" };

  try {
    const res = await fetch(`/api/agent/files?path=workspace/meridian-manufacturing/${fileName}`);
    if (!res.ok) throw new Error("Failed to load");
    const data = await res.json() as { content: string };
    return { activities: makeActivities(skill), output: data.content || "" };
  } catch {
    return { activities: makeActivities(skill), output: `*Sample output not available. Click Generate Survey to run the agent.*` };
  }
}

export const SAMPLE_INPUTS = {
  "survey-designer": {
    clientName: "Meridian Manufacturing",
    engagementType: "Holistic Total Rewards",
    clientIndustry: "Manufacturing",
    clientHeadcount: "14,800",
    surveyLength: "standard",
    workforceNotes: "60% hourly, multi-site (Columbus OH HQ + 4 plants), aging workforce with 35% over 50",
    priorityAreas: ["Medical Plans", "Retirement/401(k)", "Dental & Vision", "Wellness Programs"],
  },
};
