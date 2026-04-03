"use client";

import { useState } from "react";

type ChatResponse = {
  answer: string;
  usedFallback: boolean;
  fallbackReason?: string | null;
  guardrails: string[];
};

export function PublicAdvisor() {
  const [question, setQuestion] = useState("If my house needs heavy repairs, is off-market better than listing this spring?");
  const [cityFocus, setCityFocus] = useState("San Jose");
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function onAsk() {
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, cityFocus })
      });
      const data = (await res.json()) as ChatResponse;
      setResponse(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel section grid">
      <div>
        <h2>AI Homeowner Advisor</h2>
        <p className="meta">
          Client-facing assistant grounded in South Bay context. Designed for valuation guidance, pathway selection, and high-trust
          Q&A.
        </p>
      </div>
      <label>
        City focus
        <select value={cityFocus} onChange={(e) => setCityFocus(e.target.value)}>
          <option>San Jose</option>
          <option>Santa Clara</option>
          <option>Sunnyvale</option>
          <option>Campbell</option>
          <option>Cupertino</option>
        </select>
      </label>
      <label>
        Homeowner question
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} />
      </label>
      <div>
        <button className="primary" onClick={onAsk} disabled={loading}>
          {loading ? "Analyzing..." : "Ask Advisor"}
        </button>
      </div>
      {response ? (
        <div className="card">
          <h3>Answer</h3>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit" }}>{response.answer}</pre>
          <p className="meta" style={{ marginTop: "0.6rem" }}>
            Mode: {response.usedFallback ? "Retrieval fallback" : "Hosted model"}
          </p>
          {response.usedFallback ? (
            <div className="meta">
              Fallback reason:{" "}
              {response.fallbackReason === "missing_openai_api_key"
                ? "Set OPENAI_API_KEY in .env.local to enable live model answers."
                : response.fallbackReason === "daily_budget_exceeded"
                  ? "Daily paid-model budget reached. Response served from retrieval mode."
                  : "Provider unavailable; served from retrieval mode."}
            </div>
          ) : null}
          <div className="meta">Guardrails: {response.guardrails.join(" | ")}</div>
        </div>
      ) : null}
    </section>
  );
}
