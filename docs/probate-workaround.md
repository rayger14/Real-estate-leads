# Probate/Death Data Workaround (No Single API Required)

## Why workaround is needed
There is no single, unrestricted "Santa Clara death records API" for direct production use in investor workflows.

## Practical pipeline
1. County probate case notices
- Export/publicly capture probate case rows (case number, decedent name, city, filed date).
- Place CSV in `data/probateNotices.csv`.
- The app parses this automatically in `/api/signals`.

2. Obituary feed ingestion (optional)
- Add RSS/Atom URLs to `OBITUARY_FEEDS` in `.env.local`.
- `/api/signals` ingests items and extracts name/city heuristics.

3. Nightly precompute job
- Call `POST /api/jobs/nightly-ingest` with `x-cron-secret: $CRON_SECRET`
  or use Vercel cron (`vercel.json`).
- Job writes cached snapshot to `data/estateSignals.json`.

4. Cross-reference to owned-property target set
- Name-last-name + city matching against your acquisition list.
- Confidence weighting: probate > obituary.

5. Human verification gate
- Require manual reviewer confirmation before outreach.
- This step is mandatory because name-only matching creates false positives.

## Files powering this
- `app/api/signals/route.ts`
- `app/api/jobs/nightly-ingest/route.ts`
- `lib/providers/probateCsv.ts`
- `lib/providers/obituary.ts`
- `lib/signals.ts`
- `data/probateNotices.csv`

## Compliance
- Use only permitted records and permitted use under source terms/law.
- Follow telemarketing and privacy restrictions for outreach.
- Avoid discriminatory targeting or protected-class inferences.

## Operator workflow
- Use "Run Ingest Now" in the Internal Console to refresh signals on demand.
- Nightly cron still updates cached snapshot automatically.
- Mark leads as `verified` only after human identity/property confirmation.
