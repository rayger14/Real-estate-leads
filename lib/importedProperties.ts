import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PropertyRecord } from "@/lib/types";

const IMPORTED_PATH = join(process.cwd(), "data", "importedProperties.json");

function toFiniteNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (["true", "yes", "y", "1"].includes(normalized)) return true;
  if (["false", "no", "n", "0"].includes(normalized)) return false;
  return fallback;
}

function toOwnershipType(value: unknown): PropertyRecord["ownershipType"] {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("trust")) return "trust";
  if (text.includes("estate")) return "estate";
  if (text.includes("llc")) return "llc";
  return "individual";
}

function toAgeBand(value: unknown, ownershipYears: number): PropertyRecord["ownerAgeBand"] {
  if (value === "<45" || value === "45-59" || value === "60-74" || value === "75+") return value;
  if (ownershipYears >= 25) return "75+";
  if (ownershipYears >= 15) return "60-74";
  if (ownershipYears >= 7) return "45-59";
  return "<45";
}

function normalizeOne(input: Record<string, unknown>, idx: number): PropertyRecord | null {
  const address = String(input.address ?? "").trim();
  if (!address) return null;

  const city = String(input.city ?? "Unknown").trim() || "Unknown";
  const estimatedValue = Math.max(0, Math.round(toFiniteNumber(input.estimatedValue, 0)));
  const estimatedMortgageBalance = Math.max(0, Math.round(toFiniteNumber(input.estimatedMortgageBalance, 0)));
  const ownershipYears = Math.max(0, Math.round(toFiniteNumber(input.ownershipYears, 12)));
  const conditionScore = Math.min(10, Math.max(1, Math.round(toFiniteNumber(input.conditionScore, 5))));
  const engagementScore = Math.min(100, Math.max(0, Math.round(toFiniteNumber(input.engagementScore, 35))));

  return {
    id: String(input.id ?? `imp-${idx + 1}`),
    address,
    ownerName: String(input.ownerName ?? "").trim() || "Unknown Owner",
    city,
    bedrooms: Math.max(0, Math.round(toFiniteNumber(input.bedrooms, 0))),
    bathrooms: Math.max(0, toFiniteNumber(input.bathrooms, 0)),
    sqft: Math.max(0, Math.round(toFiniteNumber(input.sqft, 0))),
    lotSqft: Math.max(0, Math.round(toFiniteNumber(input.lotSqft, 0))),
    yearBuilt: Math.max(1800, Math.round(toFiniteNumber(input.yearBuilt, 1970))),
    conditionScore,
    estimatedValue,
    estimatedMortgageBalance,
    ownerAgeBand: toAgeBand(input.ownerAgeBand, ownershipYears),
    ownershipYears,
    ownershipType: toOwnershipType(input.ownershipType),
    absenteeOwner: toBoolean(input.absenteeOwner, false),
    trustFlag: toBoolean(input.trustFlag, false),
    taxDelinquentMonths: Math.max(0, Math.round(toFiniteNumber(input.taxDelinquentMonths, 0))),
    permitCount24m: Math.max(0, Math.round(toFiniteNumber(input.permitCount24m, 0))),
    codeViolationFlag: toBoolean(input.codeViolationFlag, false),
    lastOutboundContactDays: Math.max(0, Math.round(toFiniteNumber(input.lastOutboundContactDays, 90))),
    engagementScore,
    probateFlag: toBoolean(input.probateFlag, false),
    deathRecordMatch: toBoolean(input.deathRecordMatch, false)
  };
}

export async function readImportedProperties(): Promise<PropertyRecord[]> {
  try {
    const raw = await readFile(IMPORTED_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row, idx) => (row && typeof row === "object" ? normalizeOne(row as Record<string, unknown>, idx) : null))
      .filter((x): x is PropertyRecord => Boolean(x));
  } catch {
    return [];
  }
}
