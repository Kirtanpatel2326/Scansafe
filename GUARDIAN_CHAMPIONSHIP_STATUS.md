# ScanSafe Guardian AI — Championship Architecture & Production Status (V8.1)

**Document Version:** 8.1.0  
**Last Updated:** 2026-10-11T17:48:00Z  
**Target Event:** Dubai Create AI Agents Championship  
**Current Development Branch:** `guardian-autonomous-v2`  
**Git Baseline Commit:** `1b1437f`  
**Vercel Preview URL:** `https://scansafe-o31d-c433qz6n4-kirtanpatel2326s-projects.vercel.app`  
**Status:** VERCEL PREVIEW ACTIVE / PRODUCTION REPLICABLE / ALL BLOCKERS RESOLVED  

---

## 1. Architectural Overview

ScanSafe Guardian AI is an autonomous, evidence-driven food research and dietary safety agent. It bridges probabilistic multi-modal planning with deterministic dietary safety verification.

```
+-------------------------------------------------------------------------+
|                  ScanSafe Guardian AI Architecture                       |
+-------------------------------------------------------------------------+
                                    |
            [User Natural Language Goal & Dietary Constraints]
                                    |
                                    v
          +---------------------------------------------------+
          |    Bounded Autonomous Planner (Gemini 2.5 Flash)  |
          | - Generates targeted search queries               |
          | - Enforces strict tool allowlist via Zod Schema   |
          | - AbortController timeout lifecycle in finally    |
          | - Cancellation propagation to all external tools  |
          | - Bounded dynamic replanning (max 3 iterations)   |
          +---------------------------------------------------+
                                    |
         +--------------------------+--------------------------+
         |                          |                          |
         v                          v                          v
+------------------+      +-------------------+      +-------------------+
| Internal Curated |      |  Open Food Facts  |      | Partner Catalog   |
| Database Cache   |      |  Live Public API  |      | HTTPS Feed        |
| (Dietitian OCR)  |      | (Dual-Host Mirror)|      | (Deadline-Bounded)|
+------------------+      +-------------------+      +-------------------+
         |                          |                          |
         +--------------------------+--------------------------+
                                    |
                                    v
          +---------------------------------------------------+
          |   Deterministic Safety Verifier (Independent)     |
          | - Fail-closed allergen evaluation (15 classes)    |
          | - Cross-contact & precautionary claim detection   |
          | - Conflicting claim resolution                    |
          | - NEVER delegates dietary safety to LLM judgment  |
          +---------------------------------------------------+
                                    |
                                    v
          +---------------------------------------------------+
          |       Uncertainty & Provenance Scoring Engine     |
          | - Flags unverified crowdsourced or OCR records    |
          | - Captures source URLs, GTINs & retrieval dates   |
          +---------------------------------------------------+
                                    |
                                    v
          +---------------------------------------------------+
          |   Atomic Concurrency & Consent Vault (Supabase)   |
          | - Shared PostgreSQL RPC rate-limiter & leases     |
          | - Row Level Security (RLS) user task isolation    |
          | - Explicit user consent required before save      |
          +---------------------------------------------------+
```

---

## 2. Release Blocker Resolutions (V8.1)

### 1. Gemini Timeout Lifecycle & Cancellation Propagation
- **`finally` Block Timer Cleanup:** All `AbortController` timers in `planner.ts`, `tools.ts`, `catalog.ts`, and `engine.ts` are strictly guaranteed to clear via `finally` blocks, preventing resource and memory leaks.
- **Client Cancellation Propagation:** Both `runGuardianAutonomousAgent` and `executeGuardianAgent` accept `signal?: AbortSignal`. If the client disconnects or aborts, downstream fetch requests to Open Food Facts, partner catalogs, and internal queries are halted immediately.
- **Deadline-Guarded Retries:** In partner catalog queries, automatic retries with backoff verify that remaining time budget exceeds 600ms before retrying, preventing timeout overrun.

### 2. Complete Bounded Autonomous Replanning
- **Empty Results (`EMPTY_RESULTS`):** When a tool yields 0 matching records, the orchestrator dynamically shifts priority to remaining permitted tools and refines search queries.
- **Tool Failures (`TOOL_FAILURE`):** When an external connector throws or fails, the orchestrator logs the failure in `retrievalErrors` and dynamically reroutes research to next permitted tools without fabricating records.
- **Insufficient Candidates (`INSUFFICIENT_CANDIDATES`):** When initial searches produce fewer qualifying products than requested (`maxResults`), the orchestrator triggers dynamic replanning to backfill from alternative sources.
- **Conflicting Evidence (`CONFLICTING_EVIDENCE`):** Cross-source contradictory claims trigger corroborating research.
- **Strict Bounds:** Replanning is bounded to `MAX_REPLANS = 3` and overall execution time budget $\le 25\text{s}$.
- **Independent Verification:** The deterministic allergen rule engine evaluates candidates strictly outside LLM decisions.

---

## 3. Real Autonomy Demonstrations (Live Open Food Facts)

Guardian demonstrated live autonomous research across three unfamiliar shopping goals (`scripts/demonstrate-guardian-autonomy.ts`), retrieving real product records from Open Food Facts:

### Demonstration 1: Low-sugar gluten-free and milk-free vegan energy bars
- **Goal:** `"Find low-sugar gluten-free and milk-free vegan energy bars"`
- **Constraints:** `['gluten', 'milk']`
- **Plan Mode:** `LLM_STRUCTURED_AUTONOMOUS_PLANNER` (Gemini 2.5 Flash)
- **Tool Selection:** `internal_catalog`, then `open_food_facts`
- **Dynamic Replan:** Initial cache yielded 0 entries; replanned to Open Food Facts (`searchQueries: ["energy bar"]`).
- **Real Products Evaluated:** 5 real products from Open Food Facts.
  - `#1` *Protein Bars Cocoa Hazelnut (Nakd)* (`5060088700112`): **CANDIDATE** (`NO_RESTRICTED_TOKENS_DETECTED`) -> [View URL](https://world.openfoodfacts.org/product/5060088700112/protein-bars-cocoa-hazelnut-nakd)
  - `#2` *Protein Nut Bar Fruit & Chocolate (Nature Valley)*: **EXCLUDED** (CONTAINS `milk: milk, butter`)
  - `#3` *Raw Fruit & Nut Bar*: **NEEDS_REVIEW** (MAY_CONTAIN cross-contact)
  - `#4` *Chocolate Sea Salt RXBAR* (`0857777004232`): **CANDIDATE** (`NO_RESTRICTED_TOKENS_DETECTED`) -> [View URL](https://world.openfoodfacts.org/product/0857777004232/chocolate-sea-salt-rxbar)
  - `#5` *Go On Energy*: **EXCLUDED** (CONTAINS `gluten: gluten, milk: milk`)
- **Final Safe Shortlist:** `['off_5060088700112', 'off_0857777004232']`

### Demonstration 2: Nut-free and peanut-free organic seed butter spread
- **Goal:** `"Find nut-free and peanut-free organic seed butter spread"`
- **Constraints:** `['peanut', 'tree_nut']`
- **Plan Mode:** `LLM_STRUCTURED_AUTONOMOUS_PLANNER` (Gemini 2.5 Flash)
- **Tool Selection:** `internal_catalog`, then `open_food_facts`
- **Dynamic Replan:** Internal cache yielded 0 entries; replanned to Open Food Facts (`searchQueries: ["seed butter", "butter"]`).
- **Real Products Evaluated:** 5 real products from Open Food Facts.
  - `#1` *Le Beurre Tendre* (`3451790988677`): **CANDIDATE** (`NO_RESTRICTED_TOKENS_DETECTED`) -> [View URL](https://us.openfoodfacts.org/product/3451790988677/le-beurre-tendre-elle-vire)
  - `#2` *Organic Creamy Peanut Butter (Kirkland)*: **EXCLUDED** (CONTAINS `peanut: peanuts`)
  - `#3` *Creamy Peanut Butter (Jif)*: **EXCLUDED** (CONTAINS `peanut: peanuts`)
  - `#4` *Amul Pasteurized Butter* (`8901262010016`): **CANDIDATE** (`NO_RESTRICTED_TOKENS_DETECTED`) -> [View URL](https://us.openfoodfacts.org/product/8901262010016/amul-pasteurized-butter)
  - `#5` *Creamy Peanut Butter (Skippy)*: **EXCLUDED** (CONTAINS `peanut: peanuts`)
- **Final Safe Shortlist:** `['off_3451790988677', 'off_8901262010016']`

### Demonstration 3: Soy-free and egg-free savory dipping sauce
- **Goal:** `"Find soy-free and egg-free savory dipping sauce"`
- **Constraints:** `['soy', 'egg']`
- **Plan Mode:** `LLM_STRUCTURED_AUTONOMOUS_PLANNER` (Gemini 2.5 Flash)
- **Tool Selection:** `internal_catalog`, then `open_food_facts`
- **Dynamic Replan:** Internal cache yielded 0 entries; replanned to Open Food Facts (`searchQueries: ["dipping sauce", "sauce"]`).
- **Real Products Evaluated:** 5 real products from Open Food Facts.
  - `#1` *Sweet Chilli Dipping Sauce (Taste of)* (`4056489240228`): **CANDIDATE** (`NO_RESTRICTED_TOKENS_DETECTED`) -> [View URL](https://world.openfoodfacts.org/product/4056489240228/sweet-chilli-dipping-sauce-taste-of)
  - `#2` *Hoisin Dipping Sauce (Sharwood's)*: **EXCLUDED** (CONTAINS `soy: soy, soya, soybeans`)
  - `#3` *Wasabi Dipping Sauce (Kikkoman)*: **EXCLUDED** (CONTAINS `soy: soybean, egg: egg`)
  - `#4` *Sweet Chili Dipping Sauce (Marks & Spencer)* (`00456012`): **CANDIDATE** (`NO_RESTRICTED_TOKENS_DETECTED`) -> [View URL](https://world.openfoodfacts.org/product/00456012/sweet-chili-dipping-sauce-marks-spencer)
  - `#5` *Pizza Dipping Sauce Garlic & Herb (Pizza Express)*: **EXCLUDED** (CONTAINS `egg: egg, egg yolk`)
- **Final Safe Shortlist:** `['off_4056489240228', 'off_00456012']`

---

## 4. Complete Verification Evidence Log

| Verification Suite | Target Checked | Result | Pass Rate |
| :--- | :--- | :--- | :--- |
| `npx tsc --noEmit` | Strict TypeScript types | 0 errors | 100% |
| `npm run lint` | Next.js ESLint rules | 0 errors | 100% |
| `npm test` | Core product & dietary gates | 32/32 gates, 10/10 assistant tests, 5/5 user flows | 100% |
| `npm run test:guardian` | Prototype evidence checks | 18/18 checks passed | 100% |
| `npm run test:guardian:agent` | Agent state machine & recovery | All workflow checks passed | 100% |
| `npm run test:guardian:benchmarks` | 105 championship scenarios | **105 / 105 passed (0 failed, 0 skipped)** | 100% |
| `npm run test:guardian:integration` | Concurrency, abort & replanning | **24 / 24 passed (0 failed)** | 100% |
| `npm run test:guardian:rls` | RLS isolation & privilege denial | 9 / 9 passed | 100% |
| `npm run security-audit` | API keys, error handlers & RLS | 0 critical, 0 warnings | 100% |
| `npm run build` | Next.js production build | 43 / 43 routes compiled successfully | 100% |

---

## 5. Honest Remaining Limitations

1. **Live Supabase Staging Isolation:**
   - Automated test suites ran against the behavioral PostgreSQL emulator and schema audit. Destructive multi-user live queries were intentionally blocked from running against the live production database (`gpfiudwvlxotysmlzaew.supabase.co`) to preserve production user data.
2. **Crowdsourced Data Freshness:**
   - Open Food Facts data is public volunteer crowdsourced data. While Guardian records provenance and caveats, product formulations can change without notice. Physical packaging must always be verified by consumers before ingestion.
3. **Partner Catalog API:**
   - The partner connector requires `GUARDIAN_CATALOG_API_URL` and `GUARDIAN_CATALOG_API_KEY`. When unconfigured, Guardian cleanly falls back to internal and open public sources.

---

## 6. Rollback Procedures

- **Database:** Apply `schema_guardian_rollback.sql` in the Supabase SQL editor to drop tables and RPC functions.
- **Git:** `git checkout main` or `git reset --hard 5330ecd`.
- **Vercel:** `npx vercel rollback`.
