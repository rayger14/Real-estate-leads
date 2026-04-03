import { clamp } from "@/lib/format";
import { PropertyRecord, LeadScore } from "@/lib/types";

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function scoreProperty(record: PropertyRecord): LeadScore {
  let linear = -1.75;
  const reasons: string[] = [];

  const equityPct = clamp(
    (record.estimatedValue - record.estimatedMortgageBalance) / Math.max(record.estimatedValue, 1),
    0,
    1
  );

  if (record.deathRecordMatch || record.probateFlag) {
    linear += 1.25;
    reasons.push("Probate/death-record signal detected");
  }

  if (record.ownerAgeBand === "75+") {
    linear += 0.55;
    reasons.push("Owner age band indicates likely transition period");
  } else if (record.ownerAgeBand === "60-74") {
    linear += 0.25;
  }

  if (record.ownershipYears >= 18) {
    linear += 0.5;
    reasons.push("Long ownership duration suggests high unlocked equity");
  }

  if (record.trustFlag || record.ownershipType === "trust" || record.ownershipType === "estate") {
    linear += 0.45;
    reasons.push("Trust/estate ownership pattern");
  }

  if (record.taxDelinquentMonths > 0) {
    linear += Math.min(record.taxDelinquentMonths * 0.08, 0.48);
    reasons.push("Tax delinquency pressure");
  }

  if (record.conditionScore <= 4) {
    linear += 0.35;
    reasons.push("Below-average condition may favor off-market certainty");
  }

  if (record.absenteeOwner) {
    linear += 0.2;
  }

  if (record.codeViolationFlag) {
    linear += 0.25;
    reasons.push("Code violation indicator");
  }

  if (record.engagementScore >= 70) {
    linear += 0.35;
    reasons.push("Recent outreach engagement is high");
  } else if (record.engagementScore <= 20) {
    linear -= 0.2;
  }

  if (equityPct >= 0.6) {
    linear += 0.32;
    reasons.push("Strong estimated equity position");
  }

  const p3 = clamp(sigmoid(linear), 0.02, 0.93);
  const p6 = clamp(p3 + 0.08, 0.04, 0.96);
  const p12 = clamp(p6 + 0.11, 0.08, 0.98);

  return {
    propertyId: record.id,
    score: Math.round(p6 * 1000) / 10,
    probability3m: Math.round(p3 * 1000) / 10,
    probability6m: Math.round(p6 * 1000) / 10,
    probability12m: Math.round(p12 * 1000) / 10,
    reasons: reasons.slice(0, 4)
  };
}

export function rankSellerLeads(records: PropertyRecord[]): Array<PropertyRecord & { lead: LeadScore }> {
  return records
    .map((r) => ({ ...r, lead: scoreProperty(r) }))
    .sort((a, b) => b.lead.score - a.lead.score);
}
