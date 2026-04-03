import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PropertyRecord } from "@/lib/types";

export type PublicLeadRecord = {
  id: string;
  createdAt: string;
  ownerName: string;
  phone: string;
  email: string;
  consent: boolean;
  leadSource: "public_funnel";
  intentScore: number;
  conditionBand: "needs_work" | "average" | "updated";
  timeline: "asap" | "30_60" | "flexible";
  goal: "certainty" | "max_price" | "speed";
  property: PropertyRecord;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
};

const PUBLIC_LEADS_PATH = join(process.cwd(), "data", "publicLeads.json");

export async function readPublicLeads(): Promise<PublicLeadRecord[]> {
  try {
    const raw = await readFile(PUBLIC_LEADS_PATH, "utf8");
    const parsed = JSON.parse(raw) as PublicLeadRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writePublicLeads(leads: PublicLeadRecord[]): Promise<void> {
  await mkdir(join(process.cwd(), "data"), { recursive: true });
  await writeFile(PUBLIC_LEADS_PATH, JSON.stringify(leads, null, 2), "utf8");
}

export async function upsertPublicLead(input: PublicLeadRecord): Promise<void> {
  const leads = await readPublicLeads();
  const dedupeKey = `${input.property.address.toLowerCase()}|${input.phone}|${input.email.toLowerCase()}`;
  const existingIdx = leads.findIndex(
    (x) => `${x.property.address.toLowerCase()}|${x.phone}|${x.email.toLowerCase()}` === dedupeKey
  );

  if (existingIdx >= 0) {
    leads[existingIdx] = input;
  } else {
    leads.push(input);
  }
  await writePublicLeads(leads);
}
