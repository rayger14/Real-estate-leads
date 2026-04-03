import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { properties } from "@/data/properties";
import { fetchObituarySignals } from "@/lib/providers/obituary";
import { parseProbateCsv } from "@/lib/providers/probateCsv";
import { matchEstateTransitionSignals } from "@/lib/signals";
import { writeEstateSnapshot } from "@/lib/estateStore";
import { isInternalAuthorized, internalUnauthorizedResponse } from "@/lib/auth";

async function loadProbateCsv(): Promise<string> {
  const remote = process.env.PROBATE_CSV_URL;
  if (remote) {
    try {
      const res = await fetch(remote, { cache: "no-store" });
      if (res.ok) {
        const csv = await res.text();
        await writeFile(join(process.cwd(), "data", "probateNotices.csv"), csv, "utf8");
        return csv;
      }
    } catch {
      // Fallback to local file below.
    }
  }

  try {
    return await readFile(join(process.cwd(), "data", "probateNotices.csv"), "utf8");
  } catch {
    return "";
  }
}

async function runIngest() {
  const rawFeeds = process.env.OBITUARY_FEEDS ?? "";
  const feedUrls = rawFeeds
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  const probateCsv = await loadProbateCsv();

  const [obits, probate] = await Promise.all([
    feedUrls.length > 0 ? fetchObituarySignals(feedUrls) : Promise.resolve([]),
    Promise.resolve(parseProbateCsv(probateCsv))
  ]);

  const matches = matchEstateTransitionSignals(properties, obits, probate);

  const snapshot = {
    generatedAt: new Date().toISOString(),
    inputCounts: {
      obituarySignals: obits.length,
      probateSignals: probate.length
    },
    matchCount: matches.length,
    matches: matches.slice(0, 200)
  };

  await writeEstateSnapshot(snapshot);

  return snapshot;
}

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const headerSecret = request.headers.get("x-cron-secret");

  const isCronAuthorized = cronSecret && headerSecret && cronSecret === headerSecret;
  const isManualAuthorized = isInternalAuthorized(request);

  if (!isCronAuthorized && !isManualAuthorized) {
    return internalUnauthorizedResponse();
  }

  const snapshot = await runIngest();
  return NextResponse.json({ ok: true, snapshot });
}

export async function GET(_request: NextRequest) {
  const snapshot = await runIngest();
  return NextResponse.json({ ok: true, snapshot });
}
