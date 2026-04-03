"use client";

import { useEffect, useState } from "react";
import { PublicAdvisor } from "@/components/PublicAdvisor";
import { ScenarioAnalyzer } from "@/components/ScenarioAnalyzer";
import { InternalConsole } from "@/components/InternalConsole";

type MarketResponse = {
  asOfDate: string;
  macro: {
    mortgage30y: { date: string; value: string } | null;
    fedFunds: { date: string; value: string } | null;
    hpiSanJose: { date: string; value: string } | null;
  } | null;
  updates: Array<{
    id: string;
    asOfDate: string;
    city: string;
    topic: string;
    summary: string;
  }>;
};

export default function HomePage() {
  const [tab, setTab] = useState<"advisor" | "scenario" | "console">("advisor");
  const [market, setMarket] = useState<MarketResponse | null>(null);

  useEffect(() => {
    fetch("/api/market")
      .then((res) => res.json())
      .then((json) => setMarket(json as MarketResponse));
  }, []);

  return (
    <main className="site-shell">
      <header className="hero-shell">
        <section className="panel hero">
          <div className="hero-header">
            <div className="hero-kicker">Silicon Valley Seller Intelligence</div>
            <div className="hero-meta-line">Curated for trustee and absentee opportunities</div>
          </div>
          <div className="hero-layout">
            <div className="hero-copy">
              <h1>Sell with confidence. Underwrite with discipline.</h1>
              <div className="hero-rule" />
              <p>
                A dual-surface platform combining homeowner guidance with an internal acquisition console for South Bay properties.
              </p>
              <div className="hero-cta-row">
                <button className="primary" onClick={() => setTab("scenario")}>
                  Start With Address Analysis
                </button>
                <button className="secondary" onClick={() => setTab("advisor")}>
                  Ask Homeowner Advisor
                </button>
              </div>
            </div>
            <aside className="hero-aside">
              <div className="hero-aside-label">Market Pulse</div>
              <div className="hero-aside-value">{market?.macro?.mortgage30y?.value ? `${market.macro.mortgage30y.value}%` : "N/A"}</div>
              <div className="meta">30Y mortgage average</div>
              <div className="hero-aside-divider" />
              <div className="meta">{market?.asOfDate ? `Data as of ${market.asOfDate}` : "Market data loading..."}</div>
            </aside>
          </div>
          <div className="cards hero-cards">
            <div className="card">
              <strong>No-obligation pathing</strong>
              <div className="meta">Compare off-market certainty vs listing upside with transparent assumptions.</div>
            </div>
            <div className="card">
              <strong>Address-first workflow</strong>
              <div className="meta">Start with the property address before strategy and offer math.</div>
            </div>
            <div className="card">
              <strong>Operational guardrails</strong>
              <div className="meta">Informational advice only, with legal/tax/fair-housing controls.</div>
            </div>
          </div>
          <div className="hero-footer-note">Luxury owner experience outside, disciplined underwriting inside.</div>
        </section>
      </header>

      <section className="panel section step-strip">
        <article className="step-card">
          <div className="step-index">01</div>
          <h3>Enter property address</h3>
          <p className="meta">Capture address, condition context, and timeline.</p>
        </article>
        <article className="step-card">
          <div className="step-index">02</div>
          <h3>Evaluate all paths</h3>
          <p className="meta">Net listing path vs off-market certainty in one view.</p>
        </article>
        <article className="step-card">
          <div className="step-index">03</div>
          <h3>Take action</h3>
          <p className="meta">Prioritize leads and pair each one with outreach templates.</p>
        </article>
      </section>

      <nav className="tabs">
        <button className={tab === "advisor" ? "active" : ""} onClick={() => setTab("advisor")}>
          Homeowner AI
        </button>
        <button className={tab === "scenario" ? "active" : ""} onClick={() => setTab("scenario")}>
          Net Sheet Simulator
        </button>
        <button className={tab === "console" ? "active" : ""} onClick={() => setTab("console")}>
          Seller Likelihood
        </button>
      </nav>

      <div className="grid">
        {tab === "advisor" ? <PublicAdvisor /> : null}
        {tab === "scenario" ? <ScenarioAnalyzer /> : null}
        {tab === "console" ? <InternalConsole /> : null}

        {market ? (
          <section className="panel section signal-panel">
            <h2>Recent South Bay Signals</h2>
            <div className="cards">
              {market.updates.map((u) => (
                <article key={u.id} className="card">
                  <div className="badge">{u.city}</div>
                  <h3 className="signal-title">{u.topic}</h3>
                  <div className="meta">{u.asOfDate}</div>
                  <p className="signal-summary">{u.summary}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
