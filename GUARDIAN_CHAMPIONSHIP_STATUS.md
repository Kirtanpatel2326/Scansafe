# ScanSafe Guardian AI — Championship Architecture & Production Status (V8.9)

**Document Version:** 8.9.0  
**Last Updated:** 2026-10-15T07:28:00Z  
**Target Event:** Dubai Create AI Agents Championship  
**Current Development Branch:** `guardian-october15-security-fix`  
**Git Commit SHA:** `Pending Commit (V8.9 Production Evidence Store & Key Hardening)`  
**Vercel Preview URL:** `https://scansafe-o31d-izcksh52v-kirtanpatel2326s-projects.vercel.app`  
**Status:** VERCEL PREVIEW ACTIVE (HTTP 200) / ZERO-TRUST BOUNDARY HARDENED / 180/180 BENCHMARKS PASSED  

---

## 1. Architectural Overview

ScanSafe Guardian AI is an autonomous, evidence-driven food research and dietary safety agent. It bridges probabilistic multi-modal planning with deterministic dietary safety verification and strict goal-requirement decomposition.

```
+-------------------------------------------------------------------------+
|                  ScanSafe Guardian AI Architecture (V8.6)               |
+-------------------------------------------------------------------------+
                                    |
            [User Natural Language Goal & Dietary Constraints]
                                    |
                                    v
          +---------------------------------------------------+
          |    Structured Goal Decomposition Engine           |
          | - Required Category:                              |
          |   * seed butter != dairy butter / nut butter      |
          |   * nut butter != dairy butter                    |
          |   * vegan snack != dairy snack (cheese/yogurt)    |
          |   * GF bread != conventional wheat bread          |
          |   * cereal != non-food / toiletries               |
          |   * Unknown categories -> NEEDS_REVIEW            |
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
          |     Server-Controlled Certification Verifier (V8.6)|
          | - Zero-Trust Public API Boundary:                 |
          |   All client items sanitized to USER_UPLOADED     |
          | - Zero Hardcoded Fallback Secrets:                |
          |   Cryptographically strong (>= 32 char) key req.  |
          |   Tokens signed with old fallback secret rejected |
          | - Versioned Canonical Attestation Format:         |
          |   v1.<kid>.<expiresAt>.<hmacHex>                  |
          | - Key Rotation Support:                           |
          |   GUARDIAN_ATTESTATION_KID / PREVIOUS_KID         |
          | - Timing-Safe Attestation Verification            |
          | - Empty Production Registry Database:             |
          |   No fake/mock records hardcoded in production    |
          | - Approved URL hostname alone does NOT prove cert |
          |   existence or validity                           |
          | - 5-Level Provenance Hierarchy                    |
          | - Allergen screening strictly overrides certs     |
          +---------------------------------------------------+
                                    |
                                    v
          +---------------------------------------------------+
          |   Atomic Concurrency & Consent Vault (Supabase)   |
          | - Shared PostgreSQL RPC rate-limiter & leases     |
          | - Row Level Security (RLS) user task isolation    |
          | - Explicit user consent required before save      |
          | - Honest task state tracking:                     |
          |   COMPLETED / PARTIAL / INSUFFICIENT_EVIDENCE     |
          +---------------------------------------------------+
```

---

## 2. Certification Trust-Boundary & Adversarial Hardening (V8.6)

### Priority 0: Zero-Trust Boundary Invariants
Guardian enforces strict cryptographic and provenance trust boundaries for all claimed food certifications:

1. **Elimination of Fallback Secrets & Strong Secret Requirement:**
   - The insecure fallback secret (`scansafe-guardian-internal-attestation-secret-2026`) has been completely removed from production verification.
   - Any token generated with the legacy/deprecated fallback string is strictly rejected.
   - Minimum 32-character cryptographic server key required via `GUARDIAN_ATTESTATION_SECRET`.

2. **Versioned Tokens, Key Rotation & Expiration:**
   - Canonical payload signed with HMAC-SHA256: `v1|<kid>|<expiresAt>|<productId>|<associatedProductId>|<certificationBody>|<certificationId>|<standard>|<evidenceUrl>|<validUntil>|<verifiedAt>`.
   - Token format: `v1.<kid>.<expiresAt>.<hmacHex>`.
   - Supports key rotation across active key (`GUARDIAN_ATTESTATION_KID`) and previous key (`GUARDIAN_ATTESTATION_PREVIOUS_KID` / `GUARDIAN_ATTESTATION_SECRET_PREVIOUS`).
   - Expired tokens fail closed immediately.

3. **Empty Production Authoritative Registry:**
   - `AUTHORITATIVE_REGISTRY_DATABASE` is initialized empty `{}` in production so no fixtures are hardcoded.
   - Test suites register explicit test fixtures using `registerTestAuthoritativeCertificates`.

4. **Elimination of Client-Controlled Trust Escalation:**
   - Public API requests (`POST /api/guardian/agent`) unconditionally treat all incoming product payloads as untrusted (`USER_UPLOADED_LABEL` and `MANUALLY_PROVIDED`).
   - Any client-submitted `sourceType = INTERNAL_VERIFIED_CATALOG`, `verificationStatus = MANUFACTURER_AUTHORIZED`, `registryConfirmed = true`, or `serverAttestationToken` is stripped and rejected.
   - Trusted catalogue records are strictly retrieved server-side via authorized database queries and authenticated service credentials.

5. **Server-Controlled Certification Verification Service:**
   - A `registryConfirmed` Boolean alone is NEVER sufficient proof of authentication.
   - An approved URL hostname (e.g. `ams.usda.gov`) alone does NOT prove that a certificate exists or is valid.
   - Genuine authentication requires either a cryptographically verified server attestation token or an explicit match in the server's authoritative registry.
   - `scansafe.co.in` is strictly removed from the independent certification registry allowlist (`APPROVED_REGISTRY_DOMAINS`).

6. **Authoritative Revocation Registry:**
   - Certificate IDs listed in the authoritative revocation list (`AUTHORITATIVE_REVOCATION_REGISTRY`) or marked revoked immediately fail closed as `NEEDS_REVIEW`.

7. **Temporal Verification Integrity:**
   - Missing timestamps fail closed (`Missing verification timestamp`).
   - Unparseable timestamps fail closed (`Invalid verification timestamp`).
   - Future-dated timestamps are rejected with zero tolerance (`Future-dated verification timestamp`).

8. **Approved Verification Methods Only:**
   - Only `REGISTRY_LOOKUP_AUTHENTICATED` and `EXTERNAL_STANDARDS_VERIFIER` backed by actual verification evidence are accepted.

9. **Allergen Screening Absolute Precedence:**
   - Food allergen safety screening operates independently of certification status.
   - If a product carries a certificate but contains declared allergens or precautionary warnings, it is strictly `EXCLUDED`.

---

## 3. Complete Verification Evidence Log

| Verification Suite | Target Checked | Result | Pass Rate |
| :--- | :--- | :--- | :--- |
| `npx tsc --noEmit` | Strict TypeScript types | 0 errors | 100% |
| `npm run lint` | Next.js ESLint rules | 0 errors (176 warnings in legacy tools) | 100% |
| `npm test` | Core product & dietary gates | 32/32 gates, 10/10 assistant tests, 5/5 user flows | 100% |
| `npm run test:guardian` | Prototype evidence checks | 18/18 checks passed | 100% |
| `npm run test:guardian:agent` | Agent state machine & recovery | All workflow checks passed | 100% |
| `npm run test:guardian:benchmarks` | 180 championship scenarios (incl. 48 adversarial, anti-forgery, key & store tests) | **180 / 180 passed (0 failed, 0 skipped)** | 100% |
| `npm run test:guardian:integration` | Concurrency, abort & replanning | **25 / 25 passed (0 failed)** | 100% |
| `npm run test:guardian:rls` | RLS isolation, privilege denial & evidence store policies | 10 / 10 passed | 100% |
| `npm run security-audit` | API keys, error handlers & RLS on all 10 tables | 0 critical, 0 warnings | 100% |
| `npm run build` | Next.js production build | 43 / 43 routes compiled successfully | 100% |

---

## 4. Adversarial Benchmark Scenarios (Category 11 & 12)

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
| #143 | Public API request spoofing `INTERNAL_VERIFIED_CATALOG` & `registryConfirmed` | Stripped & fail closed: `NEEDS_REVIEW` | ✅ PASSED |
| #144 | Forged internal catalogue product ID (`CAT-INTERNAL-VERIFIED-9999`) | Sanitized & fail closed: `NEEDS_REVIEW` | ✅ PASSED |
| #145 | Legitimate product ID with attacker-supplied unauthenticated cert data | Fail closed: `NEEDS_REVIEW` | ✅ PASSED |
| #146 | Approved registry URL hostname alone does NOT prove certificate existence | Fail closed: `NEEDS_REVIEW` | ✅ PASSED |
| #147 | Valid certificate bound to another product (identity mismatch) | Fail closed: `NEEDS_REVIEW` | ✅ PASSED |
| #148 | Certificate listed in authoritative revocation registry (`AUTHORITATIVE_REVOCATION_REGISTRY`) | Fail closed: `NEEDS_REVIEW` | ✅ PASSED |
| #149 | Internal service trust-boundary bypass attempt with unauthenticated record | Fail closed: `NEEDS_REVIEW` | ✅ PASSED |
| #150 | Forged cryptographic server attestation token (HMAC mismatch) | Fail closed: `NEEDS_REVIEW` | ✅ PASSED |
| #151 | Missing or cryptographically weak signing secret (< 32 chars) | Throws error / fail closed | ✅ PASSED |
| #152 | Token signed with deprecated fallback secret | Strictly invalidated | ✅ PASSED |
| #153 | Expired attestation token | Fail closed: `NEEDS_REVIEW` | ✅ PASSED |
| #154 | Key rotation with previous active key vs unknown key id | Prev key verified; unknown kid rejected | ✅ PASSED |
| #155 | Tampered signed attestation payload presentation | Fail closed via timing-safe mismatch | ✅ PASSED |
| #156 | Category matching: Almond butter vs dairy butter | Dairy butter strictly `EXCLUDED` | ✅ PASSED |
| #157 | Category matching: Vegan snack vs dairy cheese snack | Dairy snack strictly `EXCLUDED` | ✅ PASSED |
| #158 | Category matching: Gluten-free bread vs conventional wheat bread | Wheat bread strictly `EXCLUDED` | ✅ PASSED |
| #159 | Category matching: Breakfast cereal vs non-food item | Non-food item strictly `EXCLUDED` | ✅ PASSED |
| #160 | Category matching: Unknown / ambiguous category | Fail closed: `NEEDS_REVIEW` | ✅ PASSED |
| #161 | P0 Forgery 1: Missing signing secret | Generation throws error; verification fails closed | ✅ PASSED |
| #162 | P0 Forgery 2: Predictable old fallback secret | Strictly invalidated and rejected | ✅ PASSED |
| #163 | P0 Forgery 3: Invalid or tampered attestation signature | Timing-safe verification fails closed | ✅ PASSED |
| #164 | P0 Forgery 4: Forged certificate identifier | Unmatched in registry -> fails closed (`NEEDS_REVIEW`) | ✅ PASSED |
| #165 | P0 Forgery 5: Genuine certificate ID with different product | Product identity mismatch -> fails closed (`NEEDS_REVIEW`) | ✅ PASSED |
| #166 | P0 Forgery 6: Genuine certificate ID with different standard | Standard mismatch -> fails closed (`NEEDS_REVIEW`) | ✅ PASSED |
| #167 | P0 Forgery 7: Genuine certificate ID with different evidence URL | Evidence URL mismatch -> fails closed (`NEEDS_REVIEW`) | ✅ PASSED |
| #168 | P0 Forgery 8: Expired or revoked certificates in registry | Registry expiration / revocation override -> fails closed | ✅ PASSED |
| #169 | P0 Forgery 9: Public API requests supplying privileged verification metadata | Public API sanitized to USER_UPLOADED -> fails closed | ✅ PASSED |
| #170 | P0 Forgery 10: Unavailable registry services | Authoritative registry unavailable -> `NEEDS_REVIEW` | ✅ PASSED |
| #171 | P0 Forgery 11: Internally generated evidence without completed verification | UNVERIFIED_COMMUNITY_OCR rejected -> fails closed | ✅ PASSED |
| #172 | P0 Forgery 12: Legacy unversioned 64-char hex attestation tokens | Legacy unversioned tokens strictly rejected | ✅ PASSED |
| #173 | P0 Forgery 13: Valid internal signature alone without verification record | Signature alone cannot establish authenticity -> `NEEDS_REVIEW` | ✅ PASSED |
| #174 | P0 Forgery 14: Low-entropy or trivial attestation secrets | Minimum 32 chars and >=8 unique chars required | ✅ PASSED |
| #175 | P0 Forgery 15: Production runtime prohibits test fixture injection | Runtime `NODE_ENV === 'production'` throws `SecurityError` | ✅ PASSED |
| #176 | P0 Forgery 16: Excessive attestation token lifetime (> 30 days) | Rejected on generation and verification | ✅ PASSED |
| #177 | P0 Forgery 17: Malformed or unapproved key identifier (`kid`) | Regex rejection `/^[a-zA-Z0-9_\-]{1,64}$/` -> fails closed | ✅ PASSED |
| #178 | P0 Forgery 18: Database tampering & audit record hash mismatch | SHA-256 tamper-evident check fails closed | ✅ PASSED |
| #179 | P0 Forgery 19: Explicit 256-bit key encoding (hex, base64) & entropy validation | Hex, base64, and utf8 explicit decoding enforced | ✅ PASSED |
| #180 | P0 Forgery 20: Stolen token replay for different product | Binding check fails closed -> `NEEDS_REVIEW` | ✅ PASSED |

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
- **Git:** `git checkout main` or `git reset --hard 4e09146`.
- **Vercel:** `npx vercel rollback`.
