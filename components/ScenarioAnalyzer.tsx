"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";

type Scenario = {
  channel: "off_market" | "list";
  grossPrice: number;
  totalCosts: number;
  estimatedNet: number;
  timelineDays: number;
  confidence: "low" | "medium" | "high";
  notes: string[];
};

type ScenarioResponse = {
  scenarios: Scenario[];
  valuation: {
    city: string;
    compCount: number;
    compMedian: number | null;
    avmPrice: number | null;
    blendedValue: number;
    confidence: "low" | "medium" | "high";
  };
  strategy: {
    strategy: "rundown_rebuild" | "light_renovation";
    targetProfit: number;
    projectedArv: number;
    totalProjectCostsExPurchase: number;
    maxOfferPrice: number;
    projectedInvestorProfitAtMaxOffer: number;
    decision: "buy_off_market" | "pass_or_reprice";
    notes: string[];
  };
  liveData?: {
    provider: string;
    avmPrice: number | null;
    avmRangeLow: number | null;
    avmRangeHigh: number | null;
  };
  recommendation: {
    preferredChannel: "off_market" | "list";
    estimatedNetDelta: number;
    caution: string;
  };
};

type IntakeResponse = {
  leadId: string;
  qualified: boolean;
  estimatedResponseWindow: string;
  nextStep: string;
};

function inferCityFromAddress(address: string): string {
  const parts = address
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return parts.length >= 2 ? parts[1] : "South Bay";
}

async function trackEvent(eventName: string, step: string, address?: string, city?: string, metadata?: Record<string, string>) {
  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventName, step, address, city, metadata })
    });
  } catch {
    // Keep funnel resilient even if tracking fails.
  }
}

export function ScenarioAnalyzer() {
  const [form, setForm] = useState({
    address: "123 Elm St, Menlo Park, CA",
    strategy: "rundown_rebuild" as "rundown_rebuild" | "light_renovation",
    mortgageBalance: 0,
    rehabBudget: 850000,
    targetProfit: 450000,
    holdingCostMonthly: 9000,
    monthsToCloseOffMarket: 2,
    monthsToCloseList: 4,
    listingFeePct: 5,
    sellerConcessionPct: 1.5,
    transferTaxPct: 0.2,
    conditionBand: "average" as "needs_work" | "average" | "updated",
    timeline: "30_60" as "asap" | "30_60" | "flexible",
    goal: "certainty" as "certainty" | "max_price" | "speed"
  });
  const [response, setResponse] = useState<ScenarioResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [intakeLoading, setIntakeLoading] = useState(false);
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const [intakeResult, setIntakeResult] = useState<IntakeResponse | null>(null);
  const [contact, setContact] = useState({
    ownerName: "",
    phone: "",
    email: "",
    consent: false
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onStrategyChange(strategy: "rundown_rebuild" | "light_renovation") {
    setForm((prev) => ({
      ...prev,
      strategy,
      rehabBudget: strategy === "rundown_rebuild" ? 850000 : 160000,
      targetProfit: strategy === "rundown_rebuild" ? 450000 : 200000,
      holdingCostMonthly: strategy === "rundown_rebuild" ? 9000 : 5500
    }));
  }

  async function run() {
    setLoading(true);
    setIntakeResult(null);
    setIntakeError(null);
    try {
      const res = await fetch("/api/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const json = (await res.json()) as ScenarioResponse;
      setResponse(json);
      await trackEvent("scenario_generated", "value_preview", form.address, inferCityFromAddress(form.address), {
        strategy: form.strategy
      });
    } finally {
      setLoading(false);
    }
  }

  async function submitLead() {
    setIntakeError(null);
    setIntakeLoading(true);
    try {
      const payload = {
        address: form.address,
        city: response?.valuation.city || inferCityFromAddress(form.address),
        ownerName: contact.ownerName.trim(),
        phone: contact.phone.trim(),
        email: contact.email.trim(),
        conditionBand: form.conditionBand,
        timeline: form.timeline,
        goal: form.goal,
        consent: contact.consent
      };
      const res = await fetch("/api/lead-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Unable to submit lead");
      }
      const json = (await res.json()) as IntakeResponse;
      setIntakeResult(json);
      await trackEvent("lead_gate_completed", "contact_gate", form.address, payload.city, {
        qualified: json.qualified ? "yes" : "no"
      });
    } catch (err) {
      setIntakeError(err instanceof Error ? err.message : "Unable to submit lead");
    } finally {
      setIntakeLoading(false);
    }
  }

  const quickPreview = useMemo(() => {
    if (!response) return null;
    return {
      city: response.valuation.city,
      blendedValue: response.valuation.blendedValue,
      recommendedPath: response.recommendation.preferredChannel === "off_market" ? "Off-market offer path" : "Listing path",
      netDelta: response.recommendation.estimatedNetDelta
    };
  }, [response]);

  return (
    <section className="panel section grid">
      <h2>Address Analysis + 3-Path Strategy</h2>
      <p className="meta">
        Start with a fast value preview, then unlock the full comparison report and strategy call recommendations.
      </p>

      <div className="cards">
        <label>
          Address
          <input value={form.address} onChange={(e) => update("address", e.target.value)} />
        </label>
        <label>
          Strategy
          <select value={form.strategy} onChange={(e) => onStrategyChange(e.target.value as "rundown_rebuild" | "light_renovation")}>
            <option value="rundown_rebuild">Rundown buy + rebuild</option>
            <option value="light_renovation">Light renovation flip</option>
          </select>
        </label>
        <label>
          Condition
          <select value={form.conditionBand} onChange={(e) => update("conditionBand", e.target.value as "needs_work" | "average" | "updated")}>
            <option value="needs_work">Needs work</option>
            <option value="average">Average</option>
            <option value="updated">Updated</option>
          </select>
        </label>
        <label>
          Timeline
          <select value={form.timeline} onChange={(e) => update("timeline", e.target.value as "asap" | "30_60" | "flexible")}>
            <option value="asap">ASAP</option>
            <option value="30_60">30-60 days</option>
            <option value="flexible">Flexible</option>
          </select>
        </label>
        <label>
          Priority
          <select value={form.goal} onChange={(e) => update("goal", e.target.value as "certainty" | "max_price" | "speed")}>
            <option value="certainty">Certainty</option>
            <option value="max_price">Max sale price</option>
            <option value="speed">Speed</option>
          </select>
        </label>
        <label>
          Mortgage balance
          <input type="number" value={form.mortgageBalance} onChange={(e) => update("mortgageBalance", Number(e.target.value))} />
        </label>
      </div>
      <div>
        <button className="primary" onClick={run} disabled={loading}>
          {loading ? "Analyzing..." : "Get My Value Preview"}
        </button>
      </div>

      {quickPreview ? (
        <div className="card">
          <h3>Quick Preview</h3>
          <div>City: {quickPreview.city}</div>
          <div>Estimated blended value: {formatCurrency(quickPreview.blendedValue)}</div>
          <div>Suggested path: {quickPreview.recommendedPath}</div>
          <div>Estimated net spread: {formatCurrency(quickPreview.netDelta)}</div>
        </div>
      ) : null}

      {response && !intakeResult ? (
        <div className="card grid">
          <h3>Unlock Full Comparison + Strategy Call</h3>
          <p className="meta">
            We’ll share your full side-by-side path comparison and a local strategy recommendation.
          </p>
          <div className="cards">
            <label>
              Name
              <input value={contact.ownerName} onChange={(e) => setContact((p) => ({ ...p, ownerName: e.target.value }))} />
            </label>
            <label>
              Phone
              <input value={contact.phone} onChange={(e) => setContact((p) => ({ ...p, phone: e.target.value }))} />
            </label>
            <label>
              Email
              <input type="email" value={contact.email} onChange={(e) => setContact((p) => ({ ...p, email: e.target.value }))} />
            </label>
          </div>
          <label>
            <input
              type="checkbox"
              checked={contact.consent}
              onChange={(e) => setContact((p) => ({ ...p, consent: e.target.checked }))}
            />
            {" "}I agree to be contacted about my property analysis.
          </label>
          <div>
            <button className="primary" onClick={submitLead} disabled={intakeLoading}>
              {intakeLoading ? "Submitting..." : "Get Full Comparison"}
            </button>
          </div>
          {intakeError ? <div className="meta">{intakeError}</div> : null}
        </div>
      ) : null}

      {response && intakeResult ? (
        <>
          <div className="card">
            <strong>Submitted successfully.</strong>
            <div className="meta">Lead ID: {intakeResult.leadId}</div>
            <div className="meta">Response window: {intakeResult.estimatedResponseWindow}</div>
            <div className="meta">{intakeResult.nextStep}</div>
          </div>

          <div className="cards">
            <div className="card">
              <h3>Valuation Snapshot</h3>
              <div>City: {response.valuation.city}</div>
              <div>Blended value: {formatCurrency(response.valuation.blendedValue)}</div>
              <div>Comp median: {response.valuation.compMedian ? formatCurrency(response.valuation.compMedian) : "N/A"}</div>
              <div>Comp count: {response.valuation.compCount}</div>
              <div>Confidence: {response.valuation.confidence}</div>
            </div>
            <div className="card">
              <h3>Acquisition Underwriting</h3>
              <div>Max off-market offer: {formatCurrency(response.strategy.maxOfferPrice)}</div>
              <div>Projected ARV: {formatCurrency(response.strategy.projectedArv)}</div>
              <div>Project costs (ex purchase): {formatCurrency(response.strategy.totalProjectCostsExPurchase)}</div>
              <div>Profit at max offer: {formatCurrency(response.strategy.projectedInvestorProfitAtMaxOffer)}</div>
              <div>
                Decision: <strong>{response.strategy.decision === "buy_off_market" ? "Buy off-market" : "Pass or reprice"}</strong>
              </div>
            </div>
          </div>

          <div className="cards">
            {response.scenarios.map((s) => (
              <div className="card" key={s.channel}>
                <h3>{s.channel === "off_market" ? "Seller if sold off-market" : "Seller if listed"}</h3>
                <div>Gross: {formatCurrency(s.grossPrice)}</div>
                <div>Costs: {formatCurrency(s.totalCosts)}</div>
                <div>Estimated net: {formatCurrency(s.estimatedNet)}</div>
                <div>Timeline: {s.timelineDays} days</div>
                <div>Confidence: {s.confidence}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <strong>Suggested homeowner path: {response.recommendation.preferredChannel.replace("_", " ")}</strong>
            <div>Estimated net spread: {formatCurrency(response.recommendation.estimatedNetDelta)}</div>
            <div className="meta">
              Valuation source: {response.liveData?.provider === "rentcast" ? "RentCast AVM + comp blend" : "Local comp blend fallback"}
            </div>
            <div className="meta">{response.recommendation.caution}</div>
          </div>
        </>
      ) : null}
    </section>
  );
}
