import { PropertyRecord } from "@/lib/types";
import { ObituarySignal } from "@/lib/providers/obituary";
import { ProbateCsvSignal } from "@/lib/providers/probateCsv";

export type EstateTransitionMatch = {
  propertyId: string;
  address: string;
  ownerName: string;
  city: string;
  signalType: "probate" | "obituary";
  source: string;
  signalDate: string | null;
  confidence: number;
  reason: string;
};

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}

function lastName(name: string): string {
  const parts = normalizeName(name).split(" ").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

export function matchEstateTransitionSignals(
  properties: PropertyRecord[],
  obituarySignals: ObituarySignal[],
  probateSignals: ProbateCsvSignal[]
): EstateTransitionMatch[] {
  const matches: EstateTransitionMatch[] = [];

  for (const property of properties) {
    const propLastName = lastName(property.ownerName);

    for (const sig of probateSignals) {
      if (!propLastName || !sig.decedentName) continue;
      const sigLastName = lastName(sig.decedentName);
      const cityMatch = sig.city.toLowerCase() === property.city.toLowerCase();
      if (propLastName === sigLastName && cityMatch) {
        matches.push({
          propertyId: property.id,
          address: property.address,
          ownerName: property.ownerName,
          city: property.city,
          signalType: "probate",
          source: `${sig.source} (${sig.caseNumber})`,
          signalDate: sig.filedDate,
          confidence: sig.confidence,
          reason: "Probate filing last-name + city match"
        });
      }
    }

    for (const sig of obituarySignals) {
      if (!propLastName || !sig.fullName) continue;
      const sigLastName = lastName(sig.fullName);
      const cityMatch = sig.city ? sig.city.toLowerCase() === property.city.toLowerCase() : true;
      if (propLastName === sigLastName && cityMatch) {
        matches.push({
          propertyId: property.id,
          address: property.address,
          ownerName: property.ownerName,
          city: property.city,
          signalType: "obituary",
          source: sig.sourceUrl,
          signalDate: sig.publishedDate,
          confidence: sig.confidence,
          reason: "Obituary last-name match"
        });
      }
    }
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}
