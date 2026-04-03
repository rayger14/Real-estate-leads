import { properties } from "@/data/properties";
import { clamp } from "@/lib/format";

export type ValuationSnapshot = {
  city: string;
  compCount: number;
  compMedian: number | null;
  avmPrice: number | null;
  blendedValue: number;
  confidence: "low" | "medium" | "high";
};

function detectCity(address: string): string {
  const lowered = address.toLowerCase();
  const known = ["San Jose", "Santa Clara", "Sunnyvale", "Campbell", "Cupertino", "Menlo Park", "Palo Alto"];
  for (const city of known) {
    if (lowered.includes(city.toLowerCase())) return city;
  }
  return "South Bay";
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[m - 1] + sorted[m]) / 2 : sorted[m];
}

export function buildValuationSnapshot(address: string, avmPrice?: number | null): ValuationSnapshot {
  const city = detectCity(address);
  const cityComps = properties
    .filter((p) => city === "South Bay" || p.city.toLowerCase() === city.toLowerCase())
    .map((p) => p.estimatedValue);

  const fallbackComps = properties.map((p) => p.estimatedValue);
  const compMedian = median(cityComps) ?? median(fallbackComps);
  const compCount = cityComps.length > 0 ? cityComps.length : fallbackComps.length;

  const avm = avmPrice && avmPrice > 0 ? avmPrice : null;

  const blendedBase =
    avm && compMedian
      ? avm * 0.7 + compMedian * 0.3
      : avm ?? compMedian ?? 1200000;

  const blendedValue = Math.round(clamp(blendedBase, 250000, 15000000));

  const confidence: "low" | "medium" | "high" = avm && compCount >= 3 ? "high" : compCount >= 2 ? "medium" : "low";

  return {
    city,
    compCount,
    compMedian,
    avmPrice: avm,
    blendedValue,
    confidence
  };
}
