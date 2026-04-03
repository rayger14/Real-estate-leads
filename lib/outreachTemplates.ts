import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PropertyRecord } from "@/lib/types";

export type OutreachTemplate = {
  id: string;
  title: string;
  channel: "letter" | "email";
  tags: string[];
  body: string;
};

export type OutreachSuggestion = {
  templateId: string;
  templateTitle: string;
  channel: "letter" | "email";
  opener: string;
};

const OUTREACH_PATH = join(process.cwd(), "data", "outreachTemplates.json");

export async function readOutreachTemplates(): Promise<OutreachTemplate[]> {
  try {
    const raw = await readFile(OUTREACH_PATH, "utf8");
    const parsed = JSON.parse(raw) as OutreachTemplate[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => x && x.id && x.title && x.channel && x.body);
  } catch {
    return [];
  }
}

function scoreTemplate(template: OutreachTemplate, lead: PropertyRecord): number {
  let score = 0;
  if (template.tags.includes("intro")) score += 1;
  if (template.tags.includes("follow_up")) score += lead.engagementScore >= 55 ? 2 : 0;
  if (template.tags.includes("trust")) score += lead.trustFlag || lead.ownershipType === "trust" ? 3 : 0;
  if (template.tags.includes("estate")) score += lead.ownershipType === "estate" ? 3 : 0;
  if (template.tags.includes("absentee")) score += lead.absenteeOwner ? 2 : 0;
  if (template.channel === "letter") score += 0.5;
  return score;
}

function firstSentence(body: string): string {
  const compact = body.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  const splitIdx = compact.search(/[.!?]/);
  if (splitIdx < 0) return compact.slice(0, 180);
  return compact.slice(0, Math.min(splitIdx + 1, 180));
}

export function suggestOutreachTemplate(
  lead: PropertyRecord,
  templates: OutreachTemplate[]
): OutreachSuggestion | null {
  if (templates.length === 0) return null;
  const ranked = templates
    .map((t) => ({ template: t, score: scoreTemplate(t, lead) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0]?.template;
  if (!best) return null;
  return {
    templateId: best.id,
    templateTitle: best.title,
    channel: best.channel,
    opener: firstSentence(best.body)
  };
}
