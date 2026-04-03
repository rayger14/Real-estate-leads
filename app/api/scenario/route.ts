import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildScenario } from "@/lib/scenario";
import { getRentCastAvm } from "@/lib/providers/rentcast";
import { buildValuationSnapshot } from "@/lib/valuation";

const scenarioSchema = z.object({
  address: z.string().min(6),
  strategy: z.enum(["rundown_rebuild", "light_renovation"]),
  mortgageBalance: z.number().min(0),
  rehabBudget: z.number().min(0),
  targetProfit: z.number().min(0).optional(),
  holdingCostMonthly: z.number().min(0),
  monthsToCloseOffMarket: z.number().int().min(1).max(12),
  monthsToCloseList: z.number().int().min(1).max(18),
  listingFeePct: z.number().min(0).max(10),
  sellerConcessionPct: z.number().min(0).max(10),
  transferTaxPct: z.number().min(0).max(5)
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = scenarioSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid scenario payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const liveAvm = await getRentCastAvm(parsed.data.address, process.env.RENTCAST_API_KEY);
  const valuation = buildValuationSnapshot(parsed.data.address, liveAvm?.price ?? null);

  const { scenarios, strategy } = buildScenario(parsed.data, valuation);
  const best = scenarios.slice().sort((a, b) => b.estimatedNet - a.estimatedNet)[0];

  return NextResponse.json({
    scenarios,
    valuation,
    strategy,
    liveData: {
      provider: liveAvm ? "rentcast" : "local_comps_fallback",
      avmPrice: liveAvm?.price ?? null,
      avmRangeLow: liveAvm?.priceRangeLow ?? null,
      avmRangeHigh: liveAvm?.priceRangeHigh ?? null
    },
    recommendation: {
      preferredChannel: best.channel,
      estimatedNetDelta: Math.round(Math.abs(scenarios[0].estimatedNet - scenarios[1].estimatedNet)),
      caution:
        "Directional estimate only. Validate comps, permits/entitlements, title, and tax/legal factors before final pricing."
    }
  });
}
