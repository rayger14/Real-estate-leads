# South Bay Home Intelligence MVP Architecture

## Objective
Build a dual-surface real estate AI system:
- Public homeowner advisor: off-market vs listing guidance, net expectations, tax pathway context.
- Internal acquisition console: prioritized list of likely sellers with interpretable score reasons.

## Core modules
- `app/api/chat/route.ts`: RAG-backed advisor endpoint with legal guardrails.
- `app/api/scenario/route.ts`: net-sheet simulator for off-market vs listing outcomes + optional live AVM.
- `app/api/leads/route.ts`: lead scoring endpoint for internal dashboard + optional ATTOM sale enrichment.
- `app/api/market/route.ts`: market update feed + optional live FRED macro series.
- `app/api/signals/route.ts`: estate-transition signal feed from probate CSV + obituary feeds.
- `lib/leadScoring.ts`: interpretable logistic-style scoring and reason extraction.
- `lib/scenario.ts`: deterministic scenario model for expected net proceeds.
- `lib/rag.ts`: lightweight retrieval over operating playbooks and market update snippets.
- `lib/providers/*`: live provider adapters (FRED, RentCast, ATTOM).
- `lib/signals.ts`: name/city cross-reference engine for probate/obituary matches.

## Data model
- Property-level features include ownership duration, trust/probate/death signals, condition, equity, tax delinquency, outreach engagement.
- Market updates include dated city-level summaries and source type tags.

## Cost controls
- Retrieval-first response design limits context size and wasted tokens.
- Hosted LLM is optional; fallback deterministic answer can serve low-cost mode.
- Recommend adding:
  - session-level token budget controls
  - semantic cache by `(question hash + city focus)`
  - model routing (cheap for simple Q&A, stronger for legal/tax nuance)

## Legal and compliance controls
- Output framed as informational, not legal/tax advice.
- 1031 guidance includes qualification caveat (investment property context).
- Lead scoring avoids protected classes; team should monitor for proxy bias and disparate impact.
- Data usage must align with county/public-record terms and telemarketing laws.

## Production next steps
1. Add ingestion jobs for county probate/death records, assessor data, permits, violations, and MLS aggregates.
2. Replace heuristic scoring with trained model from historical conversion outcomes.
3. Add auth and role-based access to isolate internal console.
4. Add audit logs for model outputs and outbound outreach decisions.
5. Add legal policy engine with versioning and per-answer citations.

## Internal workflow tracking
- Lead workflow status persists in `data/leadStatuses.json` via `lib/leadStatusStore.ts`.
- Endpoint `PATCH /api/leads` updates status (`new`, `verified`, `skip`, `contacted`).
- Internal UI allows inline status updates and writes timestamped audit-lite records.
