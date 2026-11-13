# AETHRA — Astronaut Health Monitoring & Decision Support System
*Beyond Earth, Beyond Limits.*

> **Research prototype.** AETHRA is not a certified medical device, is **not endorsed by or affiliated with NASA** or any space agency, does not diagnose, and does not replace a flight surgeon. All alert thresholds are illustrative. All demo data is simulated.

AETHRA (formerly "ASTRA MED") is an offline-first Next.js app that compares an astronaut's readings with their **own baseline**, explains every flag, tracks the five NASA spaceflight hazards, and guides a local emergency report. No API keys, database or cloud services are needed.

## What it does
- **Status model:** GREEN, AMBER, RED and **UNKNOWN** (missing, stale or insufficient data — never treated as healthy).
- **Explainable assessment:** every finding shows the value, personal baseline, deviation, timestamp, source and rule that fired; combined patterns are reported once, not double-counted. "Data completeness" (not "AI confidence") describes how much recent data exists.
- **Pages:** Mission Overview · Health Dashboard · Crew Overview · Health Check · Health Assessment · Health History · Body Explorer · Space Hazards · Mental Wellness · Emergency Center · Medical Reports · Scientific Resources · Settings.
- **Space Hazards:** radiation, isolation, distance (communication delay), gravity (exercise) and cabin environment, each labelled SIMULATED / MANUAL / NO DATA through pluggable adapters (`lib/adapters.ts`).
- **Emergency Center:** reports are built only from the affected person's own data (otherwise `NOT AVAILABLE`). Nothing is transmitted.
- **Reports:** PDF, JSON, CSV (RFC 4180 escaping, formula-injection guard).
- **Offline/PWA:** IndexedDB persistence with migration from the old `astra-med` database, service worker (`aethra-v2` cache), backup/restore.

## Develop
```bash
npm install
npm run dev          # http://localhost:3000
npm run typecheck && npm run lint && npm test
npm run build && npm start
```
`npm test` runs `scripts/test-engine.ts` (38 checks including IndexedDB persistence and legacy migration via `fake-indexeddb`).

## Deploy to Vercel
Import the repo (framework: Next.js, build `npm run build`). No environment variables. Open the deployed site once online so the service worker can cache all pages.

## Structure
```
app/         routes (one folder per page)         components/  Shell, ui kit, charts, forms, onboarding
lib/         assess.ts rules.ts (illustrative thresholds) validate.ts csv.ts persist.ts store.tsx
             adapters.ts isolation.ts emergency.ts export.ts access.ts content.ts demo.ts
public/      sw.js, manifest, icon                 scripts/     test-engine.ts
```

## Data & privacy
Data lives in this browser's IndexedDB, **unencrypted**, and is not synced anywhere. "Online" does not mean saved to a server. `lib/access.ts` only hides data in the UI; real deployments need server-side auth, RBAC and encryption.

## Known limitations
No real sensors, NASA feeds or ground communication. Thresholds, trend rules, the isolation indicator and emergency wording are unvalidated prototype choices. Offline behaviour and UI rendering have not been verified in a real browser by the authors of this build. `npm audit` reports advisories in Next's bundled PostCSS that only a breaking Next 16 upgrade resolves.

## References
See the in-app **Scientific Resources** page (DOIs for Patel et al. 2020, Stepanek et al. 2019, Afshinnekoo et al. 2020, Zeitlin et al. 2013, plus NASA HRP pages) with verification notes.
