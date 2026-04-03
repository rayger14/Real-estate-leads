import { MarketUpdate } from "@/lib/types";

export const marketUpdates: MarketUpdate[] = [
  {
    id: "mu-1",
    asOfDate: "2026-02-01",
    topic: "Days on market",
    city: "San Jose",
    summary: "Entry-level 2-3 bedroom inventory remains tight, with renovated homes absorbing faster than deferred-maintenance homes.",
    sourceType: "internal-analysis"
  },
  {
    id: "mu-2",
    asOfDate: "2026-01-29",
    topic: "Price sensitivity",
    city: "Sunnyvale",
    summary: "Buyer demand remains strong near major employment corridors, but outdated interiors face steeper negotiation on credits.",
    sourceType: "public-market-feed"
  },
  {
    id: "mu-3",
    asOfDate: "2026-01-25",
    topic: "Probate pipeline",
    city: "Santa Clara County",
    summary: "Recent probate-related filings indicate increased transfer activity in long-held single-family stock.",
    sourceType: "county-record"
  }
];
