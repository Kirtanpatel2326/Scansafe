# ScanSafe Guardian AI — Championship Architecture & Production Status (V8)

**Document Version:** 8.0.0  
**Last Updated:** 2026-10-11T15:52:00Z  
**Target Event:** Dubai Create AI Agents Championship  
**Current Development Branch:** `guardian-autonomous-v2`  
**Git Baseline Commit:** `076d5d98783c16756fff0947882080eefb6e8059`  
**Status:** VERCEL PREVIEW ACTIVE / PRODUCTION REPLICABLE  

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
          | - Dynamic replanning on tool exhaustion/failure   |
          +---------------------------------------------------+
                                    |
         +--------------------------+--------------------------+
         |                          |                          |
         v                          v                          v
+------------------+      +-------------------+      +-------------------+
| Internal Curated |      |  Open Food Facts  |      | Partner Catalog   |
| Database Cache   |      |  Live Public API  |      | HTTPS Feed        |
| (Dietitian OCR)  |      | (Crowdsourced GTIN|      | (Authorized Feed) |
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

## 2. Implemented Capabilities (Verified in V8)

1. **Autonomous LLM Planning & Dynamic Replanning:**
   - Powered by Google Gemini 2.5 Flash (`models/gemini-2.5-flash`).
   - Generates structured tool selection and search queries validated against `GeminiPlanOutputSchema`.
   - Tool allowlist enforcement prevents arbitrary tool execution.
   - Dynamic replanner pivots to alternative adapters when primary tool queries return zero candidates.

2. **Permitted Information Adapters with Provenance:**
   - **Internal Curated Database:** Reads from `products_cache`, distinguishing dietitian-verified records from unverified community OCR.
   - **Open Food Facts Live Connector:** Directly queries `https://world.openfoodfacts.org` with proper `Accept: application/json` headers, capturing GTIN barcodes, source URLs, timestamps, and crowdsourced limitation disclaimers.
   - **Partner Manufacturer Feed:** Validates HTTPS endpoints, size bounds (≤100 KB), and request timeouts.

3. **Deterministic Dietary Safety Verification:**
   - Evaluates across 15 standard allergen classes (Milk, Eggs, Peanuts, Tree Nuts, Fish, Shellfish, Wheat, Soy, Sesame, Mustard, Celery, Lupin, Molluscs, Sulfites, Corn).
   - Distinguishes `CONTAINS`, `MAY_CONTAIN`, `DOES_NOT_CONTAIN`, and `UNDETERMINED`.
   - Isolates marketing claims (e.g. "Dairy-Free") from actual ingredients (e.g. sodium caseinate).
   - Fails closed when ingredient panels are incomplete or truncated.

4. **Production Security & Atomic Concurrency:**
   - **Restricted RPC Functions:** `guardian_consume_rate_limit`, `guardian_acquire_concurrency_lease`, and `guardian_release_concurrency_lease` have execution permissions revoked from `PUBLIC`, `anon`, and `authenticated`; granted exclusively to `service_role`.
   - **Search Path Hardening:** `SET search_path = public, pg_temp;` applied across all database functions.
   - **Concurrency Leases:** Transactionally serialized advisory locks enforce an atomic ceiling of 2 concurrent executions per client.
   - **Safe API Error Classification:** Catch handlers in `/api/guardian/agent` use explicit error types and secure correlation IDs. Never exposes stack traces, SQL errors, or provider exceptions to clients.

5. **Packaging Cleanliness:**
   - Zero `.vercel` metadata or private `.env` credential leaks in distributable ZIP archives.

---

## 3. Test Suites & Verification Proof

All 11 test and verification gates have passed cleanly:
- `npx tsc --noEmit`: 0 errors
- `npm run lint`: 0 errors
- `npm test`: 32/32 core gates, 10/10 assistant tests, 5/5 user flows
- `npm run test:guardian`: 18/18 prototype checks passed
- `npm run test:guardian:agent`: Agent state machine, recovery, and non-fabrication verified
- `npm run test:guardian:benchmarks`: **105 / 105 passed (0 failed, 0 skipped)**
- `npm run test:guardian:integration`: 17/17 passed (including 50-client simultaneous lease acquisition stress test)
- `npm run test:guardian:rls`: 9/9 passed (schema audit, multi-user isolation, privilege denial)
- `npm run security-audit`: 0 critical issues, 0 warnings
- `npm run build`: Production build succeeded in 4.7s across all 43 static & dynamic routes

---

## 4. Honest Remaining Limitations

1. **Live Supabase Staging Isolation:**
   - Automated test suites ran against the behavioral PostgreSQL emulator and schema audit. Destructive multi-user live queries were intentionally blocked from running against the live production database (`gpfiudwvlxotysmlzaew.supabase.co`) to preserve production user data.
2. **Crowdsourced Data Freshness:**
   - Open Food Facts data is public volunteer crowdsourced data. While Guardian records provenance and caveats, product formulations can change without notice. Physical packaging must always be verified by consumers before ingestion.
3. **Manufacturer Partner API:**
   - The partner connector requires `GUARDIAN_CATALOG_API_URL` and `GUARDIAN_CATALOG_API_KEY`. When unconfigured, Guardian cleanly falls back to internal and open public sources.

---

## 5. Rollback Procedures

- **Database:** Apply `schema_guardian_rollback.sql` in the Supabase SQL editor to drop tables and RPC functions.
- **Git:** `git checkout main` or `git reset --hard 5330ecd`.
- **Vercel:** `npx vercel rollback`.
