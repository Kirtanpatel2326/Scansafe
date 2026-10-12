# ScanSafe Guardian AI — Championship Architecture & Production Status (V8.3)

**Document Version:** 8.3.0  
**Last Updated:** 2026-10-12T13:55:00Z  
**Target Event:** Dubai Create AI Agents Championship  
**Current Development Branch:** `guardian-autonomous-v2`  
**Git Commit SHA:** `4e8db31a0f3bb7983609e8cdd923d8fcadc8b0c0`  
**Vercel Preview URL:** `https://scansafe-o31d-n2d87bpfm-kirtanpatel2326s-projects.vercel.app`  
**Status:** VERCEL PREVIEW ACTIVE / CERTIFICATION PROVENANCE AUTHENTICATED / 132/132 BENCHMARKS PASSED  

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
          |    Trustworthy Certification Provenance Engine    |
          | - 5-Level Provenance Hierarchy                    |
          |   (UNVERIFIED_PRODUCT_METADATA ->                 |
          |    USER_UPLOADED_LABEL_EVIDENCE ->                |
          |    MANUFACTURER_SELF_DECLARED ->                  |
          |    DOCUMENTED_THIRD_PARTY_CLAIM ->                |
          |    INDEPENDENTLY_AUTHENTICATED_CERTIFICATION)     |
          | - String declarations NEVER establish verified    |
          |   certification automatically                     |
          | - Strict identity & active status enforcement     |
          | - Non-empty evidenceUrl proof audit               |
          | - Mandatory category matching fail-closed         |
          | - Direct allergen violation overrules cert claims |
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

## 2. Trustworthy Certification Provenance & Evidence Reliability (V8.3)

### Priority 0: Trustworthy Certification Provenance Model
Guardian enforces an immutable 5-level provenance model:
1. `UNVERIFIED_PRODUCT_METADATA`: Unverified crowdsourced or scrape metadata.
2. `USER_UPLOADED_LABEL_EVIDENCE`: Photos/OCR submitted directly by end-users.
3. `MANUFACTURER_SELF_DECLARED`: Claims made on packaging without independent auditing.
4. `DOCUMENTED_THIRD_PARTY_CLAIM`: Documented claim citing an accredited auditing body.
5. `INDEPENDENTLY_AUTHENTICATED_CERTIFICATION`: Authenticated via official public registry lookup or third-party database.

**Mandatory Integrity Invariants:**
- For every claimed certification, Guardian stores: `certificationBody`, `certificationId`, `associatedProductId`, `evidenceUrl`, `observedAt`, `verifiedAt`, `verificationMethod`, `provenanceLevel`.
- **Zero String Inflation:** A string in `certificationsDeclared` alone strictly returns `NEEDS_REVIEW` and cannot establish verified status.
- **Identity Matching:** Any certificate issued for `associatedProductId` differing from the candidate product identity is rejected as `NEEDS_REVIEW`.
- **Status Audit:** Expired, revoked, or unverified certificates are strictly rejected.
- **Proof URL Audit:** Certificates lacking a verifiable `evidenceUrl` are rejected as `NEEDS_REVIEW`.
- **Allergen Precedence:** Direct allergen tokens or precautionary statements take absolute priority over any certificate claim (contradictory evidence results in strict `EXCLUDED`).

### Priority 1: Generic Product-Category Matching
- Mandatory categories require supporting evidence. Unknown/unverified product categories return `categoryMatch = false` and `NEEDS_REVIEW`.
- Animal dairy butter is strictly `EXCLUDED` from satisfying seed-butter spread requests.

---

## 3. Complete Verification Evidence Log

| Verification Suite | Target Checked | Result | Pass Rate |
| :--- | :--- | :--- | :--- |
| `npx tsc --noEmit` | Strict TypeScript types | 0 errors | 100% |
| `npm run lint` | Next.js ESLint rules | 0 errors | 100% |
| `npm test` | Core product & dietary gates | 32/32 gates, 10/10 assistant tests, 5/5 user flows | 100% |
| `npm run test:guardian` | Prototype evidence checks | 18/18 checks passed | 100% |
| `npm run test:guardian:agent` | Agent state machine & recovery | All workflow checks passed | 100% |
| `npm run test:guardian:benchmarks` | 132 championship scenarios | **132 / 132 passed (0 failed, 0 skipped)** | 100% |
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
