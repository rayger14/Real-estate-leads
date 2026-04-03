import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { EstateTransitionMatch } from "@/lib/signals";

export type EstateSignalSnapshot = {
  generatedAt: string;
  inputCounts: { obituarySignals: number; probateSignals: number };
  matchCount: number;
  matches: EstateTransitionMatch[];
};

const SNAPSHOT_PATH = join(process.cwd(), "data", "estateSignals.json");

export async function readEstateSnapshot(): Promise<EstateSignalSnapshot | null> {
  try {
    const raw = await readFile(SNAPSHOT_PATH, "utf8");
    return JSON.parse(raw) as EstateSignalSnapshot;
  } catch {
    return null;
  }
}

export async function writeEstateSnapshot(snapshot: EstateSignalSnapshot): Promise<void> {
  await mkdir(join(process.cwd(), "data"), { recursive: true });
  await writeFile(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), "utf8");
}
