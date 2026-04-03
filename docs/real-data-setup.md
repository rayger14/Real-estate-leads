# Real Data Setup (South Bay)

This project now supports live data providers. You must provision keys in your own accounts; API keys cannot be auto-discovered from code.

## Required for production chat
- `OPENAI_API_KEY`
  - Use for high-quality homeowner Q&A in `app/api/chat/route.ts`.
  - Docs: https://platform.openai.com/docs
- `INTERNAL_DASHBOARD_PASSWORD`
  - Required for login to internal endpoints (`/api/leads`, `/api/signals`).
- `CRON_SECRET`
  - Required for scheduled ingest endpoint (`/api/jobs/nightly-ingest`).

## Recommended market intelligence
- `FRED_API_KEY`
  - Used in `app/api/market/route.ts` for live macro series:
    - `MORTGAGE30US` (30Y mortgage average)
    - `FEDFUNDS`
    - `ATNHPIUS41940Q` (San Jose-Sunnyvale-Santa Clara HPI)
  - Key page: https://fred.stlouisfed.org/docs/api/api_key.html
  - API docs: https://fred.stlouisfed.org/docs/api/fred/

## Property enrichment (valuation)
- `RENTCAST_API_KEY`
  - Used in `app/api/scenario/route.ts` via `/v1/avm/value`.
  - Site/docs entry: https://developers.rentcast.io
  - Also blended with local comp median in `lib/valuation.ts`.

## Zillow note
- Zillow data access is typically available through approved partner/program channels rather than a simple open public API key path.
- For production reliability, use approved data vendors (or MLS/assessor + your own model) as primary valuation feeds.

## Property deed/sale enrichment (enterprise)
- `ATTOM_API_KEY`
  - Used in `app/api/leads/route.ts` via `sale/snapshot`.
  - Docs: https://api.developer.attomdata.com/docs

## Probate/death workaround feeds
- `OBITUARY_FEEDS`
  - Comma-separated RSS/Atom URLs for obituary feeds.
  - Used in `app/api/signals/route.ts`.
- Probate CSV ingestion
  - Save county/public-probate export rows in `data/probateNotices.csv`.
  - Parsed and cross-referenced in `/api/signals`.
  - Optional automation: set `PROBATE_CSV_URL`; nightly job pulls and refreshes file.

## Probate/death-record reality (important)
- Santa Clara County does not provide a simple public "death-record API key" model for direct unrestricted API pulls.
- Vital/death records are handled through county clerk-recorder workflows and legal constraints.
- Sources:
  - Santa Clara County Clerk-Recorder: https://clerkrecorder.sccgov.org/services-we-provide/vital-services
  - California Department of Public Health vital records: https://www.cdph.ca.gov/Programs/CHSI/Pages/Vital-Records.aspx

For production, most investor teams ingest probate/public-notice data through licensed data vendors or approved county data channels, then cross-reference assessor/parcel and internal CRM outcomes.

## Compliance checklist
- Treat AI output as informational, not legal/tax advice.
- Review outreach for DNC/telemarketing and privacy compliance.
- Avoid protected-class features and proxy discrimination in seller scoring.
- DNC reference: https://www.ftc.gov/business-guidance/resources/complying-telemarketing-sales-rule
