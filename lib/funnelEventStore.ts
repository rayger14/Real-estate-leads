import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type FunnelEvent = {
  id: string;
  timestamp: string;
  eventName: string;
  step: string;
  address?: string;
  city?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

const EVENTS_PATH = join(process.cwd(), "data", "funnelEvents.json");

export async function readFunnelEvents(): Promise<FunnelEvent[]> {
  try {
    const raw = await readFile(EVENTS_PATH, "utf8");
    const parsed = JSON.parse(raw) as FunnelEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function appendFunnelEvent(event: FunnelEvent): Promise<void> {
  const current = await readFunnelEvents();
  current.push(event);
  const capped = current.slice(-3000);
  await mkdir(join(process.cwd(), "data"), { recursive: true });
  await writeFile(EVENTS_PATH, JSON.stringify(capped, null, 2), "utf8");
}
