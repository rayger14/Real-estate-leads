import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { properties } from "@/data/properties";
import { fetchObituarySignals } from "@/lib/providers/obituary";
import { parseProbateCsv } from "@/lib/providers/probateCsv";
import { matchEstateTransitionSignals } from "@/lib/signals";
import { readEstateSnapshot } from "@/lib/estateStore";

export async function GET(_request: NextRequest) {
  const snapshot = await readEstateSnapshot();
  if (snapshot) {
    return NextResponse.json({
      ...snapshot,
      source: "cached_snapshot",
      notes: [
        "Nightly snapshot loaded.",
        "Use this feed for research prioritization only and verify identity before outreach.",
        "False positives are expected with name-only matching."
      ]
    });
  }

  const rawFeeds = process.env.OBITUARY_FEEDS ?? "";
  const feedUrls = rawFeeds
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  let probateCsv = "";
  try {
    probateCsv = await readFile(join(process.cwd(), "data/probateNotices.csv"), "utf8");
  } catch {
    probateCsv = "";
  }

  const [obits, probate] = await Promise.all([
    feedUrls.length > 0 ? fetchObituarySignals(feedUrls) : Promise.resolve([]),
    Promise.resolve(parseProbateCsv(probateCsv))
  ]);

  const matches = matchEstateTransitionSignals(properties, obits, probate);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    inputCounts: {
      obituarySignals: obits.length,
      probateSignals: probate.length
    },
    matchCount: matches.length,
    matches: matches.slice(0, 30),
    notes: [
      "Use this feed for research prioritization only and verify identity before outreach.",
      "False positives are expected with name-only matching.",
      "Comply with privacy, telemarketing, and fair housing obligations before contact."
    ]
  });
}
