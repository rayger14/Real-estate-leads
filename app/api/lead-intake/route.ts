import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { appendFunnelEvent } from "@/lib/funnelEventStore";
import { PublicLeadRecord, upsertPublicLead } from "@/lib/publicLeadStore";
import { PropertyRecord } from "@/lib/types";

const intakeSchema = z.object({
  address: z.string().min(6),
  city: z.string().min(2),
  ownerName: z.string().min(2),
  phone: z.string().min(7),
  email: z.string().email(),
  conditionBand: z.enum(["needs_work", "average", "updated"]),
  timeline: z.enum(["asap", "30_60", "flexible"]),
  goal: z.enum(["certainty", "max_price", "speed"]),
  consent: z.boolean(),
  utm: z
    .object({
      source: z.string().optional(),
      medium: z.string().optional(),
      campaign: z.string().optional(),
      content: z.string().optional(),
      term: z.string().optional()
    })
    .optional()
});

function makeId(seed: string): string {
  let hash = 5381;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 33) ^ seed.charCodeAt(i);
  return `pub-${Math.abs(hash >>> 0)}`;
}

function inferIntentScore(input: z.infer<typeof intakeSchema>): number {
  let score = 45;
  if (input.timeline === "asap") score += 20;
  if (input.goal === "certainty") score += 15;
  if (input.conditionBand === "needs_work") score += 12;
  if (input.consent) score += 8;
  return Math.min(100, score);
}

function estimateValue(city: string, conditionBand: "needs_work" | "average" | "updated"): number {
  const c = city.toLowerCase();
  let base = 1600000;
  if (c.includes("cupertino")) base = 2300000;
  if (c.includes("saratoga")) base = 2600000;
  if (c.includes("menlo")) base = 2800000;
  if (c.includes("los altos")) base = 3000000;
  if (c.includes("santa clara")) base = 1700000;
  if (conditionBand === "needs_work") return Math.round(base * 0.9);
  if (conditionBand === "updated") return Math.round(base * 1.08);
  return base;
}

function toPropertyRecord(input: z.infer<typeof intakeSchema>, id: string, intentScore: number): PropertyRecord {
  return {
    id,
    address: input.address,
    ownerName: input.ownerName,
    city: input.city,
    bedrooms: 0,
    bathrooms: 0,
    sqft: 0,
    lotSqft: 0,
    yearBuilt: 1970,
    conditionScore: input.conditionBand === "needs_work" ? 3 : input.conditionBand === "updated" ? 8 : 5,
    estimatedValue: estimateValue(input.city, input.conditionBand),
    estimatedMortgageBalance: 0,
    ownerAgeBand: "60-74",
    ownershipYears: 12,
    ownershipType: "individual",
    absenteeOwner: false,
    trustFlag: false,
    taxDelinquentMonths: 0,
    permitCount24m: 0,
    codeViolationFlag: false,
    lastOutboundContactDays: 0,
    engagementScore: intentScore,
    probateFlag: false,
    deathRecordMatch: false
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = intakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid intake payload", details: parsed.error.flatten() }, { status: 400 });
  }
  if (!parsed.data.consent) {
    return NextResponse.json({ error: "Consent is required" }, { status: 400 });
  }

  const createdAt = new Date().toISOString();
  const leadId = makeId(`${parsed.data.address}|${parsed.data.phone}|${createdAt}`);
  const intentScore = inferIntentScore(parsed.data);

  const leadRecord: PublicLeadRecord = {
    id: leadId,
    createdAt,
    ownerName: parsed.data.ownerName,
    phone: parsed.data.phone,
    email: parsed.data.email,
    consent: parsed.data.consent,
    leadSource: "public_funnel",
    intentScore,
    conditionBand: parsed.data.conditionBand,
    timeline: parsed.data.timeline,
    goal: parsed.data.goal,
    property: toPropertyRecord(parsed.data, leadId, intentScore),
    utm: parsed.data.utm
  };

  await upsertPublicLead(leadRecord);
  await appendFunnelEvent({
    id: `evt-${leadId}`,
    timestamp: createdAt,
    eventName: "lead_submitted",
    step: "contact_gate",
    address: parsed.data.address,
    city: parsed.data.city,
    metadata: {
      intentScore,
      goal: parsed.data.goal,
      timeline: parsed.data.timeline,
      conditionBand: parsed.data.conditionBand
    }
  });

  return NextResponse.json({
    leadId,
    qualified: intentScore >= 65,
    estimatedResponseWindow: "15 minutes during business hours",
    nextStep: "A local specialist will review your scenario and contact you."
  });
}
