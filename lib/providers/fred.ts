export type FredObservation = {
  date: string;
  value: string;
};

type FredSeriesResponse = {
  observations: FredObservation[];
};

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

export async function getFredLatest(seriesId: string, apiKey: string): Promise<FredObservation | null> {
  const url = new URL(FRED_BASE);
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", "12");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;

  const data = (await res.json()) as FredSeriesResponse;
  const latest = data.observations.find((o) => o.value !== ".");
  return latest ?? null;
}

export async function getSouthBayMacro(apiKey?: string) {
  if (!apiKey) return null;

  const [mortgage30y, fedFunds, hpiSanJose] = await Promise.all([
    getFredLatest("MORTGAGE30US", apiKey),
    getFredLatest("FEDFUNDS", apiKey),
    getFredLatest("ATNHPIUS41940Q", apiKey)
  ]);

  return {
    mortgage30y,
    fedFunds,
    hpiSanJose
  };
}
