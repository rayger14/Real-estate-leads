import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type LeadWorkflowStatus = "new" | "verified" | "skip" | "contacted";

export type LeadStatusRecord = {
  status: LeadWorkflowStatus;
  updatedAt: string;
};

export type LeadStatusMap = Record<string, LeadStatusRecord>;

const STATUS_PATH = join(process.cwd(), "data", "leadStatuses.json");

export async function readLeadStatuses(): Promise<LeadStatusMap> {
  try {
    const raw = await readFile(STATUS_PATH, "utf8");
    return JSON.parse(raw) as LeadStatusMap;
  } catch {
    return {};
  }
}

export async function writeLeadStatuses(map: LeadStatusMap): Promise<void> {
  await mkdir(join(process.cwd(), "data"), { recursive: true });
  await writeFile(STATUS_PATH, JSON.stringify(map, null, 2), "utf8");
}

export async function setLeadStatus(propertyId: string, status: LeadWorkflowStatus): Promise<LeadStatusMap> {
  const current = await readLeadStatuses();
  current[propertyId] = {
    status,
    updatedAt: new Date().toISOString()
  };
  await writeLeadStatuses(current);
  return current;
}
