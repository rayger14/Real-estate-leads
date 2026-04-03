"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/format";

type LeadWorkflowStatus = "new" | "verified" | "skip" | "contacted";

type Lead = {
  id: string;
  address: string;
  city: string;
  ownerAgeBand: string;
  ownershipType: string;
  conditionScore: number;
  estimatedValue: number;
  lead: {
    score: number;
    probability3m: number;
    probability6m: number;
    probability12m: number;
    reasons: string[];
  };
  workflow: {
    status: LeadWorkflowStatus;
    updatedAt: string | null;
  };
  leadSource?: string;
  outreach?: {
    templateId: string;
    templateTitle: string;
    channel: "letter" | "email";
    opener: string;
  } | null;
  liveData?: {
    attom?: {
      lastSalePrice?: number;
      lastSaleDate?: string;
      ownerOccupied?: boolean;
    } | null;
  };
};

type LeadResponse = {
  generatedAt: string;
  leadCount: number;
  leads: Lead[];
};

type SignalMatch = {
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

type SignalResponse = {
  generatedAt: string;
  inputCounts: { obituarySignals: number; probateSignals: number };
  matchCount: number;
  matches: SignalMatch[];
  notes: string[];
};

export function InternalConsole() {
  const [data, setData] = useState<LeadResponse | null>(null);
  const [signals, setSignals] = useState<SignalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);

  async function loadData() {
    try {
      setError(null);
      const [leadRes, signalRes] = await Promise.all([fetch("/api/leads"), fetch("/api/signals")]);
      if (!leadRes.ok || !signalRes.ok) {
        throw new Error(`Lead API ${leadRes.status}, Signals API ${signalRes.status}`);
      }
      const [leadJson, signalJson] = await Promise.all([leadRes.json(), signalRes.json()]);
      setData(leadJson as LeadResponse);
      setSignals(signalJson as SignalResponse);
    } catch {
      setError("Unable to load seller likelihood data. Please refresh or try again.");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function runIngestNow() {
    setIngestLoading(true);
    try {
      setError(null);
      const res = await fetch("/api/jobs/nightly-ingest");
      if (!res.ok) {
        throw new Error(`Ingest API ${res.status}`);
      }
      await loadData();
    } catch {
      setError("Ingest failed. Check your network and data provider settings.");
    } finally {
      setIngestLoading(false);
    }
  }

  async function updateStatus(propertyId: string, status: LeadWorkflowStatus) {
    setStatusSavingId(propertyId);
    try {
      setError(null);
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, status })
      });
      if (!res.ok) {
        throw new Error(`Update API ${res.status}`);
      }
      await loadData();
    } catch {
      setError("Status update failed. Please retry.");
    } finally {
      setStatusSavingId(null);
    }
  }

  return (
    <section className="panel section grid">
      <div>
        <h2>Acquisition Console (Internal)</h2>
        <p className="meta">
          Ranked lead list based on transition, equity, condition, and engagement signals. Do not use protected traits or proxy
          discrimination for outreach.
        </p>
        <div style={{ marginTop: "0.6rem" }}>
          <button className="secondary" onClick={runIngestNow} disabled={ingestLoading}>
            {ingestLoading ? "Running ingest..." : "Run Ingest Now"}
          </button>
        </div>
      </div>
      {error ? <div className="card meta">{error}</div> : null}
      {data ? (
        <>
          <div className="meta">Generated: {new Date(data.generatedAt).toLocaleString()}</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Score</th>
                  <th>3m</th>
                  <th>6m</th>
                  <th>12m</th>
                  <th>Condition</th>
                  <th>Est. Value</th>
                  <th>Source</th>
                  <th>Workflow</th>
                  <th>Key Signals</th>
                </tr>
              </thead>
              <tbody>
                {data.leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <div>{lead.address}</div>
                      <div className="meta">{lead.city}</div>
                    </td>
                    <td>
                      <span className={`badge ${lead.lead.score > 65 ? "warn" : "ok"}`}>{lead.lead.score}%</span>
                    </td>
                    <td>{lead.lead.probability3m}%</td>
                    <td>{lead.lead.probability6m}%</td>
                    <td>{lead.lead.probability12m}%</td>
                    <td>{lead.conditionScore}/10</td>
                    <td>{formatCurrency(lead.estimatedValue)}</td>
                    <td>{lead.leadSource ?? "list_ingest"}</td>
                    <td>
                      <select
                        value={lead.workflow.status}
                        onChange={(e) => updateStatus(lead.id, e.target.value as LeadWorkflowStatus)}
                        disabled={statusSavingId === lead.id}
                      >
                        <option value="new">new</option>
                        <option value="verified">verified</option>
                        <option value="skip">skip</option>
                        <option value="contacted">contacted</option>
                      </select>
                      <div className="meta">
                        {lead.workflow.updatedAt ? new Date(lead.workflow.updatedAt).toLocaleString() : "not updated"}
                      </div>
                    </td>
                    <td>
                      {lead.lead.reasons.join("; ")}
                      {lead.outreach ? (
                        <div className="meta outreach-meta">
                          Outreach: {lead.outreach.templateTitle} ({lead.outreach.channel})
                          {lead.outreach.opener ? ` - ${lead.outreach.opener}` : ""}
                        </div>
                      ) : null}
                      {lead.liveData?.attom?.lastSalePrice ? (
                        <div className="meta">
                          ATTOM last sale: {formatCurrency(lead.liveData.attom.lastSalePrice)} ({lead.liveData.attom.lastSaleDate ?? "n/a"})
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="meta">Loading lead model output...</div>
      )}

      {signals ? (
        <div className="card">
          <h3>Estate Transition Signals</h3>
          <div className="meta">
            Inputs: {signals.inputCounts.probateSignals} probate records, {signals.inputCounts.obituarySignals} obituary entries
          </div>
          <div className="table-wrap" style={{ marginTop: "0.5rem" }}>
            <table>
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Owner</th>
                  <th>Signal</th>
                  <th>Confidence</th>
                  <th>Date</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {signals.matches.map((m, idx) => (
                  <tr key={`${m.propertyId}-${idx}`}>
                    <td>{m.address}</td>
                    <td>{m.ownerName}</td>
                    <td>{m.signalType}</td>
                    <td>{Math.round(m.confidence * 100)}%</td>
                    <td>{m.signalDate ?? "n/a"}</td>
                    <td>{m.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
