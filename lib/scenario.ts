import { clamp } from "@/lib/format";
import { NetScenario, ScenarioInput } from "@/lib/types";
import { ValuationSnapshot } from "@/lib/valuation";

export type StrategySummary = {
  strategy: "rundown_rebuild" | "light_renovation";
  targetProfit: number;
  projectedArv: number;
  totalProjectCostsExPurchase: number;
  maxOfferPrice: number;
  projectedInvestorProfitAtMaxOffer: number;
  decision: "buy_off_market" | "pass_or_reprice";
  notes: string[];
};

export function strategyDefaults(strategy: ScenarioInput["strategy"]) {
  if (strategy === "rundown_rebuild") {
    return {
      targetProfit: 450000,
      arvMultiplier: 2.0,
      buyClosingPct: 1.2,
      sellClosingPct: 6.0,
      baseRehab: 850000,
      softCostPctArv: 7.5,
      holdMonths: 10
    };
  }

  return {
    targetProfit: 200000,
    arvMultiplier: 1.12,
    buyClosingPct: 1.0,
    sellClosingPct: 5.5,
    baseRehab: 160000,
    softCostPctArv: 2.0,
    holdMonths: 5
  };
}

export function buildScenario(input: ScenarioInput, valuation: ValuationSnapshot): { scenarios: NetScenario[]; strategy: StrategySummary } {
  const defaults = strategyDefaults(input.strategy);
  const targetProfit = input.targetProfit ?? defaults.targetProfit;

  const rehabBudget = Math.max(input.rehabBudget, defaults.baseRehab);
  const projectedArv = Math.round(valuation.blendedValue * defaults.arvMultiplier);
  const holdMonths = Math.max(input.monthsToCloseOffMarket, defaults.holdMonths);
  const holding = input.holdingCostMonthly * holdMonths;
  const sellCosts = (projectedArv * defaults.sellClosingPct) / 100;
  const softCosts = (projectedArv * defaults.softCostPctArv) / 100;
  const totalProjectCostsExPurchase = rehabBudget + holding + sellCosts + softCosts;

  const maxOfferPriceRaw =
    (projectedArv - totalProjectCostsExPurchase - targetProfit) /
    (1 + defaults.buyClosingPct / 100);
  const maxOfferPrice = Math.round(clamp(maxOfferPriceRaw, 0, projectedArv));

  const projectedInvestorProfitAtMaxOffer = Math.round(
    projectedArv - totalProjectCostsExPurchase - maxOfferPrice * (1 + defaults.buyClosingPct / 100)
  );

  const offMarketPrice = maxOfferPrice;
  const offMarketHolding = input.holdingCostMonthly * input.monthsToCloseOffMarket;
  const offMarketCosts = offMarketHolding + (offMarketPrice * input.transferTaxPct) / 100;
  const offMarketNet = offMarketPrice - input.mortgageBalance - offMarketCosts;

  const listPremiumPct = input.strategy === "rundown_rebuild" ? 0.01 : 0.03;
  const listPrice = valuation.blendedValue * (1 + listPremiumPct);
  const listHolding = input.holdingCostMonthly * input.monthsToCloseList;
  const listingFee = (listPrice * input.listingFeePct) / 100;
  const concessions = (listPrice * input.sellerConcessionPct) / 100;
  const listPrepCost = input.strategy === "rundown_rebuild" ? rehabBudget * 0.2 : rehabBudget * 0.55;
  const listCosts = listingFee + concessions + listHolding + listPrepCost + (listPrice * input.transferTaxPct) / 100;
  const listNet = listPrice - input.mortgageBalance - listCosts;

  const decision = projectedInvestorProfitAtMaxOffer >= targetProfit ? "buy_off_market" : "pass_or_reprice";

  const strategySummary: StrategySummary = {
    strategy: input.strategy,
    targetProfit,
    projectedArv,
    totalProjectCostsExPurchase: Math.round(totalProjectCostsExPurchase),
    maxOfferPrice,
    projectedInvestorProfitAtMaxOffer,
    decision,
    notes:
      input.strategy === "rundown_rebuild"
        ? [
            "Modeled as teardown/rebuild style project with higher soft costs and longer hold.",
            "ARV uses multiplier against blended valuation; tune per submarket and lot constraints.",
            "Confirm entitlement, utility upgrade, and permit timing before final offer."
          ]
        : [
            "Modeled as cosmetic/functional renovation with lower soft costs and shorter hold.",
            "Target profit floor defaults to $200k unless overridden.",
            "Adjust rehab budget after inspection to tighten max-offer precision."
          ]
  };

  return {
    scenarios: [
      {
        channel: "off_market",
        grossPrice: offMarketPrice,
        totalCosts: Math.round(offMarketCosts),
        estimatedNet: Math.round(offMarketNet),
        timelineDays: input.monthsToCloseOffMarket * 30,
        confidence: valuation.confidence,
        notes: ["Offer derived from investor underwriting and target profit floor", "Faster certainty pathway", "Lower seller prep burden"]
      },
      {
        channel: "list",
        grossPrice: Math.round(listPrice),
        totalCosts: Math.round(listCosts),
        estimatedNet: Math.round(listNet),
        timelineDays: input.monthsToCloseList * 30,
        confidence: valuation.confidence === "high" ? "medium" : valuation.confidence,
        notes: ["Potentially higher gross depending on execution", "Higher prep/showing burden", "Outcome more sensitive to market timing"]
      }
    ],
    strategy: strategySummary
  };
}
