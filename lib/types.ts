export type OwnershipType = "individual" | "trust" | "llc" | "estate";

export type PropertyRecord = {
  id: string;
  address: string;
  ownerName: string;
  city: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  lotSqft: number;
  yearBuilt: number;
  conditionScore: number;
  estimatedValue: number;
  estimatedMortgageBalance: number;
  ownerAgeBand: "<45" | "45-59" | "60-74" | "75+";
  ownershipYears: number;
  ownershipType: OwnershipType;
  absenteeOwner: boolean;
  trustFlag: boolean;
  taxDelinquentMonths: number;
  permitCount24m: number;
  codeViolationFlag: boolean;
  lastOutboundContactDays: number;
  engagementScore: number;
  probateFlag: boolean;
  deathRecordMatch: boolean;
};

export type MarketUpdate = {
  id: string;
  asOfDate: string;
  topic: string;
  city: string;
  summary: string;
  sourceType: "internal-analysis" | "county-record" | "public-market-feed";
};

export type ScenarioInput = {
  address: string;
  strategy: "rundown_rebuild" | "light_renovation";
  mortgageBalance: number;
  rehabBudget: number;
  targetProfit?: number;
  holdingCostMonthly: number;
  monthsToCloseOffMarket: number;
  monthsToCloseList: number;
  listingFeePct: number;
  sellerConcessionPct: number;
  transferTaxPct: number;
};

export type NetScenario = {
  channel: "off_market" | "list";
  grossPrice: number;
  totalCosts: number;
  estimatedNet: number;
  timelineDays: number;
  confidence: "low" | "medium" | "high";
  notes: string[];
};

export type LeadScore = {
  propertyId: string;
  score: number;
  probability3m: number;
  probability6m: number;
  probability12m: number;
  reasons: string[];
};
