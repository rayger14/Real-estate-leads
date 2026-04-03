# South Bay Home Intelligence Platform

Full-stack MVP for your South Bay operating model:
- Public AI advisor for homeowners (off-market vs listing guidance).
- Offer & listing strategy engine with address-first valuation.
- Internal seller-likelihood queue with explainable scores and live property enrichments.
- Estate-transition signal feed (probate CSV + obituary feed matching).

## Stack
- Next.js (App Router)
- TypeScript
- Zod validation
- Retrieval-first advisor architecture
- Optional hosted model + live market/property APIs

## Run locally
```bash
npm install
npm run dev
```
Open `http://localhost:3000`.

## Configure keys
Copy `.env.example` to `.env.local` and set what you want to enable.

Core:
- `OPENAI_API_KEY`: hosted model answers in `/api/chat`.
- `OPENAI_DAILY_CALL_LIMIT`: daily cap for paid model calls before fallback mode.
- `CRON_SECRET`: required for scheduled job calls to `/api/jobs/nightly-ingest`.

Live data:
- `FRED_API_KEY`: live macro rates/HPI in `/api/market`.
- `RENTCAST_API_KEY`: live AVM in `/api/scenario`.
- `ATTOM_API_KEY`: sale snapshot enrichment in `/api/leads`.
- `OBITUARY_FEEDS`: comma-separated obituary RSS feeds in `/api/signals`.
- `PROBATE_CSV_URL`: optional remote probate CSV used by nightly ingest job.

Complete setup details and source links:
- `docs/real-data-setup.md`
- `docs/probate-workaround.md`
- `docs/install-troubleshooting.md`

## Product surfaces
- `Homeowner AI`: chat with South Bay context and legal/tax guardrails.
- `Offer & Listing Engine`: max off-market offer + seller listing comparison from strategy underwriting.
- `Seller Likelihood`: ranked internal targets with reason codes.
- `Estate Transition Signals`: matched probate/obituary entries for manual review.
- `Nightly Ingest Job`: precomputes estate-transition matches and caches snapshot.

## Import your real lead files
Use your CSV/XLSX lead exports to replace sample lead data in Seller Likelihood.

```bash
npm run import:leads -- --source "/Users/raymondghandchi/Desktop/Absentee lists"
```

This writes normalized records to `data/importedProperties.json`.
`/api/leads` will automatically use imported records when that file exists.

## Guardrails
- Informational guidance only; not legal/tax advice.
- 1031 discussion is contextual and must be reviewed by licensed tax/legal professionals.
- Lead-scoring workflows must remain fair-housing, privacy, and telemarketing compliant.
- Zillow does not provide a simple public free API for this workflow; this build uses RentCast + internal comps as default valuation path.

## Key files
- `app/page.tsx`
- `app/api/chat/route.ts`
- `app/api/market/route.ts`
- `app/api/scenario/route.ts`
- `app/api/leads/route.ts`
- `app/api/signals/route.ts`
- `app/api/jobs/nightly-ingest/route.ts`
- `app/api/auth/login/route.ts`
- `app/api/auth/me/route.ts`
- `vercel.json`
- `lib/providers/fred.ts`
- `lib/providers/rentcast.ts`
- `lib/providers/attom.ts`
- `docs/architecture.md`
- `docs/real-data-setup.md`

## Internal workflow statuses
Leads support persisted internal statuses:
- `new`
- `verified`
- `skip`
- `contacted`

Status updates are saved through `PATCH /api/leads` and shown in the internal table.
