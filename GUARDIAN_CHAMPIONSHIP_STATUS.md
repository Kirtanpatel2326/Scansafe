# ScanSafe Guardian AI — Championship Architecture & Production Status (V8.2)

**Document Version:** 8.2.0  
**Last Updated:** 2026-10-12T12:55:00Z  
**Target Event:** Dubai Create AI Agents Championship  
**Current Development Branch:** `guardian-autonomous-v2`  
**Vercel Preview URL:** `https://scansafe-o31d-kh2ua0yb0-kirtanpatel2326s-projects.vercel.app`  
**Status:** VERCEL PREVIEW ACTIVE / PRODUCTION REPLICABLE / FOOD EVIDENCE RELIABILITY VERIFIED  

---

## 1. Architectural Overview

ScanSafe Guardian AI is an autonomous, evidence-driven food research and dietary safety agent. It bridges probabilistic multi-modal planning with deterministic dietary safety verification and strict goal-requirement decomposition.

```
+-------------------------------------------------------------------------+
|                  ScanSafe Guardian AI Architecture                       |
+-------------------------------------------------------------------------+
                                    |
            [User Natural Language Goal & Dietary Constraints]
                                    |
                                    v
          +---------------------------------------------------+
          |    Structured Goal Decomposition Engine           |
          | - Required Category (seed butter != dairy butter) |
          | - Required Attributes (organic, vegan, low-sugar) |
          | - Excluded Ingredients (direct animal/allergens)  |
          | - Regulatory thresholds (<=5g sugar/100g)         |
          +---------------------------------------------------+
                                    |
                                    v
          +---------------------------------------------------+
          |    Bounded Autonomous Planner (Gemini 2.5 Flash)  |
          | - Generates category-accurate search queries      |
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
| Internal Curated |      | Partner Catalog   |      |  Open Food Facts  |
| Database Cache   |      | HTTPS Feed        |      |  Live Public API  |
| (Dietitian OCR)  |      | (Deadline-Bounded)|      | (Dual-Host Mirror)|
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
          |       Food Evidence Reliability & Goal Verifier   |
          | - Never treats absent allergens as proof of safe  |
          | - Organic requires verified certification (USDA,  |
          |   EU Organic, Ecocert, etc.); name claims = REVIEW|
          | - Vegan flags ambiguous additives (glycerin,      |
          |   mono/diglycerides, natural flavors); requires   |
          |   explicit certification for MATCH                |
          | - Never guarantees allergy safety; warns review   |
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

## 2. Food Evidence Reliability & Priority Corrections (V8.2)

### Priority 0: Dietary False-Positive Prevention
- **Absence of Evidence is Not Proof:** For `peanut_free`, `nut_free`, and `gluten_free`, clean ingredient lists without detected tokens are strictly marked `NEEDS_REVIEW` (never `MATCH`) unless supported by documented independent third-party certifications (`Certified Peanut-Free`, `GFCO`, etc.) or explicit packaging declarations.
- **Precautionary Statements Screened:** "May contain" and "manufactured on shared equipment" warnings strictly result in `EXCLUDED`.
- **Zero False Reassurance:** Physical packaging inspection is always required; the engine never claims a product is "guaranteed safe".

### Priority 1: Organic & Vegan Certification Verification
- **Verified Organic Standards:** Requires documented third-party certification provenance (`USDA Organic`, `EU Organic`, `Ecocert`, `Jaivik Bharat`, `Demeter`, `Bio-Siegel`, etc.). Product-name keywords (`name.includes("organic")`) without certification provenance return `NEEDS_REVIEW`.
- **Ambiguous Vegan Additives:** Screened for ambiguous additives (`mono- and diglycerides`, `glycerin`, `natural flavors`, `bone char`, `vitamin d3`, `stearic acid`). Uncertified products with ambiguous additives or uncertified plant ingredients return `NEEDS_REVIEW`.

### Priority 2: Product Goal & Shortlist Integrity
- **Category Separation:** Seed-butter requests strictly exclude ordinary dairy butter and nut butters.
- **Quota Protection:** When only $K < \text{maxResults}$ products satisfy all criteria, the shortlist strictly contains $K$ items. Zero backfilling of `EXCLUDED` or `NEEDS_REVIEW` products.

---

## 3. Real Autonomy Demonstrations (Live Open Food Facts)

Executed via `npx tsx scripts/demonstrate-guardian-autonomy.ts` against real live products:

### Demonstration 1: Low-sugar gluten-free and milk-free vegan energy bars
- **Goal:** `"Find low-sugar gluten-free and milk-free vegan energy bars"`
- **Constraints:** `['gluten', 'milk']`
- **Plan Mode:** `LLM_STRUCTURED_AUTONOMOUS_PLANNER` (Gemini 2.5 Flash)
- **Result:** Crowdsourced bars lacking verified low-sugar/vegan certification returned `NEEDS_REVIEW` or `EXCLUDED`.
- **Shortlist:** `[None qualifying]` (Zero false positives admitted).

### Demonstration 2: Nut-free and peanut-free organic seed butter spread
- **Goal:** `"Find nut-free and peanut-free organic seed butter spread"`
- **Constraints:** `['peanut', 'tree_nut']`
- **Plan Mode:** `LLM_STRUCTURED_AUTONOMOUS_PLANNER` (Gemini 2.5 Flash)
- **Evaluated Products:**
  - `[#1]` *NuttZo Organic 7 Nut & Seed Butter POWER FUEL*: **EXCLUDED** (`tree_nut: almonds, cashews, hazelnuts, brazil nuts`)
  - `[#2]` *Vanilla Almond Butter Nut Granola*: **EXCLUDED** (`tree_nut: almonds, cashews`)
  - `[#3]` *Sunflower Seed Butter (SunButter)*: **NEEDS_REVIEW** (Crowdsourced data without verified packaging cert)
  - `[#4]` *Sunflower Seed Butter*: **NEEDS_REVIEW**
  - `[#5]` *Sunflower Seed Butter Chocolate*: **NEEDS_REVIEW**
- **Shortlist:** `[None qualifying]` (Correctly excluded dairy butter, peanut butter, and unverified entries).

### Demonstration 3: Soy-free and egg-free savory dipping sauce
- **Goal:** `"Find soy-free and egg-free savory dipping sauce"`
- **Constraints:** `['soy', 'egg']`
- **Plan Mode:** `LLM_STRUCTURED_AUTONOMOUS_PLANNER` (Gemini 2.5 Flash)
- **Evaluated Products:**
  - `[#1]` *Wasabi sauce (Kikkoman)*: **EXCLUDED** (`soy: soybean, egg: egg`)
  - `[#2]` *Gyoza Dipping Sauce*: **EXCLUDED** (`soy: soy, soybeans`)
  - `[#3]` *Yum Yum Dipping Sauce*: **EXCLUDED** (`egg: egg, egg yolk`)
  - `[#4]` *Tempura Shrimp with Soy Dipping Sauce*: **EXCLUDED** (`soy: soy, soybean`)
  - `[#5]` *Spring Rolls with Shrimp and cashew sauce*: **NEEDS_REVIEW** (Incomplete declaration)
- **Shortlist:** `[None qualifying]`.

---

## 4. Complete Verification Evidence Log

| Verification Suite | Target Checked | Result | Pass Rate |
| :--- | :--- | :--- | :--- |
| `npx tsc --noEmit` | Strict TypeScript types | 0 errors | 100% |
| `npm run lint` | Next.js ESLint rules | 0 errors | 100% |
| `npm test` | Core product & dietary gates | 32/32 gates, 10/10 assistant tests, 5/5 user flows | 100% |
| `npm run test:guardian` | Prototype evidence checks | 18/18 checks passed | 100% |
| `npm run test:guardian:agent` | Agent state machine & recovery | All workflow checks passed | 100% |
| `npm run test:guardian:benchmarks` | 122 championship scenarios | **122 / 122 passed (0 failed, 0 skipped)** | 100% |
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
