# ScanSafe Guardian AI — Championship Architecture & Production Status (V8.4)

**Document Version:** 8.4.0  
**Last Updated:** 2026-10-14T05:55:00Z  
**Target Event:** Dubai Create AI Agents Championship  
**Current Development Branch:** `guardian-autonomous-v2`  
**Git Commit SHA:** `d4861b58` (V8.4 Trust-Boundary Release)  
**Vercel Preview URL:** `https://scansafe-o31d-57012ugfo-kirtanpatel2326s-projects.vercel.app`  
**Status:** VERCEL PREVIEW ACTIVE / CERTIFICATION TRUST-BOUNDARY HARDENED / 142/142 BENCHMARKS PASSED  

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
          |     Certification Trust-Boundary Engine (V8.4)    |
          | - 5-Level Provenance Hierarchy                    |
          | - Rejection of unauthenticated claims & forgeries |
          | - Valid, past-dated verification timestamps       |
          | - Explicitly approved authentication methods only |
          |   (REGISTRY_LOOKUP_AUTHENTICATED /                |
          |    EXTERNAL_STANDARDS_VERIFIER)                   |
          | - Server-controlled registry confirmation checks  |
          | - Approved authoritative registry domain audit    |
          | - Product ID, brand, and validity period binding  |
          | - Revocation & expiration enforcement             |
          | - Public API status injection sanitization        |
          | - Allergen screening strictly overrides certs     |
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

## 2. Certification Trust-Boundary & Adversarial Hardening (V8.4)

### Priority 0: Trust-Boundary Authentication Invariants
Guardian enforces strict cryptographic and provenance trust boundaries for all claimed food certifications:
1. **Verification Timestamps:**
   - Missing timestamps fail closed (`Missing verification timestamp`).
   - Unparseable timestamps fail closed (`Invalid verification timestamp`).
   - Future-dated timestamps are rejected with zero tolerance (`Future-dated verification timestamp`).
2. **Approved Verification Methods Only:**
   - Only `REGISTRY_LOOKUP_AUTHENTICATED` and `EXTERNAL_STANDARDS_VERIFIER` backed by actual verification evidence are accepted.
   - Self-declarations and label inspections fail closed.
3. **No Equating of Third-Party Claims:**
   - `DOCUMENTED_THIRD_PARTY_CLAIM` is explicitly rejected as unauthenticated (`cannot be equated with independently authenticated certification`).
4. **Public API Injection Sanitization:**
   - External inputs from public API callers (`POST /api/guardian/agent`) cannot self-assign `INDEPENDENTLY_AUTHENTICATED_CERTIFICATION` or `registryConfirmed: true`.
   - Client-supplied records are automatically sanitized to `USER_UPLOADED_LABEL_EVIDENCE` and `registryConfirmed: false`.
5. **Server-Controlled Registry Confirmation & Domain Audit:**
   - `registryConfirmed === true` required for any active certification status.
   - Proof URLs must resolve to explicitly approved authoritative registry domains (`ams.usda.gov`, `usda.gov`, `ecocert.com`, `gfco.org`, `beyondceliac.org`, `allergencircles.org`, `standards.org`, `ccof.org`, `scansafe.co.in`, etc.). Plausible forgeries fail closed.
6. **Product Identity, Brand & Validity Period Binding:**
   - Product identifier must match candidate (`associatedProductId === product.id`).
   - Brand must match declared product brand where specified.
   - Validity periods (`validFrom` and `validUntil`) are strictly enforced.
7. **Revocation & Expiration Status:**
   - Explicit revocation (`isRevoked: true` or `status: 'REVOKED'`) or expiration (`status: 'EXPIRED'` or expired `validUntil`) immediately fails compliance.
8. **Fail-Closed Default:**
   - Any failure to authenticate returns `NEEDS_REVIEW` with exact, transparent provenance reasoning.
9. **Allergen Screening Absolute Precedence:**
   - Food allergen safety screening operates independently of certification status.
   - If a product carries a certificate but contains declared allergens or precautionary warnings, it is strictly `EXCLUDED`.

---

## 3. Complete Verification Evidence Log

| Verification Suite | Target Checked | Result | Pass Rate |
| :--- | :--- | :--- | :--- |
| `npx tsc --noEmit` | Strict TypeScript types | 0 errors | 100% |
| `npm run lint` | Next.js ESLint rules | 0 errors | 100% |
| `npm test` | Core product & dietary gates | 32/32 gates, 10/10 assistant tests, 5/5 user flows | 100% |
| `npm run test:guardian` | Prototype evidence checks | 18/18 checks passed | 100% |
| `npm run test:guardian:agent` | Agent state machine & recovery | All workflow checks passed | 100% |
| `npm run test:guardian:benchmarks` | 142 championship scenarios (incl. 10 adversarial) | **142 / 142 passed (0 failed, 0 skipped)** | 100% |
| `npm run test:guardian:integration` | Concurrency, abort & replanning | **24 / 24 passed (0 failed)** | 100% |
| `npm run test:guardian:rls` | RLS isolation & privilege denial | 9 / 9 passed | 100% |
| `npm run security-audit` | API keys, error handlers & RLS | 0 critical, 0 warnings | 100% |
| `npm run build` | Next.js production build | 43 / 43 routes compiled successfully in 3.3s | 100% |

---

## 4. Adversarial Benchmark Scenarios (Category 11)

| Scenario | Adversarial Vector | Expected Outcome | Verification Status |
| :--- | :--- | :--- | :--- |
| #133 | Forged certification record with plausible unapproved URL | Fail closed: `NEEDS_REVIEW` | ✅ PASSED |
| #134 | ACTIVE status without registry confirmation | Fail closed: `NEEDS_REVIEW` | ✅ PASSED |
| #135 | Missing verification timestamp | Fail closed: `NEEDS_REVIEW` | ✅ PASSED |
| #136 | Future-dated verification timestamp | Fail closed: `NEEDS_REVIEW` | ✅ PASSED |
| #137 | Unsupported verification method (`PACKAGING_LABEL_INSPECTION`) | Fail closed: `NEEDS_REVIEW` | ✅ PASSED |
| #138 | Certificate associated with another brand (brand mismatch) | Fail closed: `NEEDS_REVIEW` | ✅ PASSED |
| #139 | Explicitly revoked certificate (`isRevoked: true`, `status: 'REVOKED'`) | Fail closed: `NEEDS_REVIEW` | ✅ PASSED |
| #140 | `DOCUMENTED_THIRD_PARTY_CLAIM` without authentication | Fail closed: `NEEDS_REVIEW` | ✅ PASSED |
| #141 | Conflicting certification and ingredient evidence | Strict Exclusion: `EXCLUDED` | ✅ PASSED |
| #142 | Attempted injection of trusted status through public API request | Sanitized & fail closed: `NEEDS_REVIEW` | ✅ PASSED |

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
- **Git:** `git checkout main` or `git reset --hard 371c896`.
- **Vercel:** `npx vercel rollback`.
