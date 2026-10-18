# ScanSafe Guardian AI — Championship Architecture & Production Status (V8.19)

**Document Version:** 8.19.0  
**Last Updated:** 2026-10-18T14:40:00Z  
**Target Event:** Dubai Create AI Agents Championship  
**Current Development Branch:** `guardian-october15-security-fix`  
**Git Commit SHA:** `ade86aa`  
**Live Vercel Preview URL:** `https://scansafe-o31d-afgq1b7qh-kirtanpatel2326s-projects.vercel.app`  
**Status:** VALIDATED RELEASE CANDIDATE / 255/255 BENCHMARKS PASSED / 13/13 RLS PASSED / 44/44 NEXT.JS ROUTES COMPILED / PRODUCTION UNTOUCHED  

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
| `npm run test:guardian:benchmarks` | 255 championship scenarios (incl. 53 adversarial, 15 route, 15 dual-path, 15 identity/anti-forgery tests) | **255 / 255 passed (0 failed, 0 skipped)** | 100% |
| `npm run test:guardian:integration` | Concurrency, abort & replanning | **25 / 25 passed (0 failed)** | 100% |
| `npm run test:guardian:rls` | RLS isolation, privilege denial, bounds & 50 concurrent requests | **13 / 13 passed** | 100% |
| `npm run security-audit` | API keys, error handlers & RLS on all 10 tables | 0 critical, 0 warnings | 100% |
| `npm run build` | Next.js production build | 44 / 44 routes compiled successfully | 100% |

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
| #181 | P0 Forgery 21: Stale revocation check (> 30 days) | Revocation status stale (> 30d) -> fails closed (`NEEDS_REVIEW`) | ✅ PASSED |
| #182 | P0 Forgery 22: Multi-instance TTL cache invalidation and expiration | Cache invalidation purges record immediately | ✅ PASSED |
| #183 | P0 Forgery 23: Async verification callers (`verifyClaimedCertificationAsync`) | Async database verification successfully authenticates | ✅ PASSED |
| #184 | P0 Forgery 24: Public verification projection strips internal audit fields | `auditRecordHash`, `auditHistory`, `operationId` hidden | ✅ PASSED |
| #185 | P0 Forgery 25: Direct raw SELECT denial on internal evidence table | `anon` / `authenticated` direct SELECT denied; safe RPC only | ✅ PASSED |
| #186 | P0 Consistency 01: Failed database lookup with previously cached valid record | Fail closed: `authenticated: false` (stale cache purged) | ✅ PASSED |
| #187 | P0 Consistency 02: Database connection outage / exception in `fetchRecordFromDatabase` | Fail closed: `authenticated: false` (cache purged) | ✅ PASSED |
| #188 | P0 Consistency 03: Missing database credentials in production environment | Fail closed: `authenticated: false` without test fixtures | ✅ PASSED |
| #189 | P0 Consistency 04: Direct verification passing `explicitVerifiedOp = null` | Fail closed: `authenticated: false` despite valid signature | ✅ PASSED |
| #190 | P0 Consistency 05: Multi-instance consistency in `evaluateProductGoalRelevanceAsync` | Multi-instance revocation detected; claim degraded | ✅ PASSED |
| #191 | P0 Consistency 06: Synchronous `verifyClaimedCertification()` in production | Fail closed: `authenticated: false` (sync calls prohibited) | ✅ PASSED |
| #192 | P0 Consistency 07: Synchronous `evaluateProductGoalRelevance()` in production | Fail closed: `NEEDS_REVIEW` (sync calls prohibited) | ✅ PASSED |
| #193 | P0 Consistency 08: Stale cached cert cannot override DB revocation in goal check | Fail closed: `NEEDS_REVIEW` (fresh DB lookup enforced) | ✅ PASSED |
| #194 | P0 Consistency 09: Stale cached cert cannot override DB record removal | Fail closed: `NEEDS_REVIEW` (stale cache purged) | ✅ PASSED |
| #195 | P0 Consistency 10: Database outage during async goal check fails closed | Fail closed: `NEEDS_REVIEW` without cache fallback | ✅ PASSED |
| #196 | P0 Route 01: Missing or malformed dates (`validFrom`, `validUntil`, `verifiedAt`) | Fail closed: `verificationStatus = 'MALFORMED_TIMESTAMPS'`, `isCurrentlyValid = false` | ✅ PASSED |
| #197 | P0 Route 02: Current date outside validity period (expired or future-dated) | Fail closed: `verificationStatus = 'EXPIRED' / 'NOT_YET_VALID'`, `isCurrentlyValid = false` | ✅ PASSED |
| #198 | P0 Route 03: Missing or stale revocation evidence (> 30 days) | Fail closed: `verificationStatus = 'STALE_VERIFICATION'`, `isCurrentlyValid = false` | ✅ PASSED |
| #199 | P0 Route 04: Revoked certificate authoritative check | Fail closed: `verificationStatus = 'REVOKED'`, `recordType = 'HISTORICAL_EVIDENCE_RECORD'` | ✅ PASSED |
| #200 | P0 Route 05: Strict binding to product, barcode, manufacturer, authority, and standard | Evaluates exact binding; mismatches fail closed with specific status | ✅ PASSED |
| #201 | P0 Route 06: Database record existence never implies current validity | Expired/revoked records returned as `isCurrentlyValid = false` | ✅ PASSED |
| #202 | P0 Route 07: Cache-Control header strictly enforces `no-store` on cert status | Real-time verification preserved; proxy/browser caching denied | ✅ PASSED |
| #203 | P0 Route 08: Fail closed on database failure or missing certificate ID (HTTP 404/400) | Missing or invalid params return HTTP 404/400 error | ✅ PASSED |
| #204 | P0 Route 09: External POST and PUT submissions rejected | HTTP 405 Method Not Allowed; clients cannot create/mutate certs | ✅ PASSED |
| #205 | P0 Route 10: Zero-exposure of internal cryptographic hashes or operational metadata | `auditRecordHash`, `auditHistory`, `operationId`, `id` stripped | ✅ PASSED |
| #206 | P0 Route 11: Contradictory validity dates (`validFrom > validUntil`) | Fail closed: `CONTRADICTORY_VALIDITY_DATES`, `isCurrentlyValid = false` | ✅ PASSED |
| #207 | P0 Route 12: Future verification/revocation timestamp beyond 5-min clock skew | Fail closed: `FUTURE_DATED_VERIFICATION`, `isCurrentlyValid = false` | ✅ PASSED |
| #208 | P0 Route 13: Strict matching when stored field is missing | Fail closed with mismatch status rather than skipping validation | ✅ PASSED |
| #209 | P0 Route 14: Tampered/unauthorized operation lacking registry provenance | Returns HTTP 404; anti-tamper hash mismatch fails closed | ✅ PASSED |
| #210 | P0 Route 15: Revoked certificate previously in memory invalidated via `bypassCache` | `bypassCache: true` immediately catches revocation across instances | ✅ PASSED |
| #211 | P0 Dual-Path 01: Missing/malformed dates fail closed on both public API and async verifier | Dual-path equivalence: `MALFORMED_TIMESTAMPS` on both paths | ✅ PASSED |
| #212 | P0 Dual-Path 02: Contradictory validity dates fail closed on both public API and async verifier | Dual-path equivalence: `CONTRADICTORY_VALIDITY_DATES` on both paths | ✅ PASSED |
| #213 | P0 Dual-Path 03: Future-dated `verifiedAt` fails closed on both public API and async verifier | Dual-path equivalence: `FUTURE_DATED_VERIFICATION` on both paths | ✅ PASSED |
| #214 | P0 Dual-Path 04: Future-dated `revocationCheckedAt` fails closed on both public API and async verifier | Dual-path equivalence: `FUTURE_DATED_VERIFICATION` on both paths | ✅ PASSED |
| #215 | P0 Dual-Path 05: Missing standard on authoritative record fails closed with `STANDARD_MISMATCH` | Authoritative field omission triggers mismatch; never skipped | ✅ PASSED |
| #216 | P0 Dual-Path 06: Missing `evidenceUrl` on authoritative record fails closed with `EVIDENCE_URL_MISMATCH` | Authoritative field omission triggers mismatch; never skipped | ✅ PASSED |
| #217 | P0 Dual-Path 07: Missing `issuingAuthority` on authoritative record fails closed with `ISSUING_AUTHORITY_MISMATCH` | Authoritative field omission triggers mismatch; never skipped | ✅ PASSED |
| #218 | P0 Dual-Path 08: Missing brand on authoritative record fails closed with `MANUFACTURER_MISMATCH` | Authoritative field omission triggers mismatch; never skipped | ✅ PASSED |
| #219 | P0 Dual-Path 09: Stale revocation evidence (>30 days) fails closed on both public API and recommendation engine | Goal relevance degrades to `NEEDS_REVIEW`; public API flags `STALE_VERIFICATION` | ✅ PASSED |
| #220 | P0 Dual-Path 10: Revoked certificate fails closed on both public API and recommendation engine | Goal relevance degrades to `NEEDS_REVIEW`; public API flags `REVOKED` | ✅ PASSED |
| #221 | P0 Dual-Path 11: Expired certificate fails closed on both public API and recommendation engine | Goal relevance degrades to `NEEDS_REVIEW`; public API flags `EXPIRED` | ✅ PASSED |
| #222 | P0 Dual-Path 12: Certificate not yet valid fails closed on both public API and recommendation engine | Goal relevance degrades to `NEEDS_REVIEW`; public API flags `NOT_YET_VALID` | ✅ PASSED |
| #223 | P0 Dual-Path 13: Product identity mismatch fails closed on both public API and async verifier | Product identity binding mismatch rejected on both paths | ✅ PASSED |
| #224 | P0 Dual-Path 14: Database outage or missing record fails closed on both paths | DB unreachable or missing returns HTTP 404 (API) and fails closed (verifier) | ✅ PASSED |
| #225 | P0 Dual-Path 15: Fully authentic matching certificate passes BOTH public API and recommendation engine | Dual-path equivalence: `AUTHENTICATED_VALID` and goal attribute `MATCH` | ✅ PASSED |
| #241 | P0 Regression 01: Misleading brand alias (`Nature Valley` vs `Nature Harvest`) | Strict rejection: `MANUFACTURER_MISMATCH` | ✅ PASSED |
| #242 | P0 Regression 02: Misleading brand alias (`General Mills` vs `Simple Mills`) | Strict rejection: `MANUFACTURER_MISMATCH` | ✅ PASSED |
| #243 | P0 Regression 03: Generic standard claim (`organic`) claiming `NOP_ORGANIC` | Strict rejection: `STANDARD_MISMATCH` (no generic leak) | ✅ PASSED |
| #244 | P0 Regression 04: Generic standard claim (`gluten free`) claiming `GFCO_GLUTEN_FREE` | Strict rejection: `STANDARD_MISMATCH` (no generic leak) | ✅ PASSED |
| #245 | P0 Regression 05: Marketing buzzword (`clean label`) claiming `CLEAN_LABEL_PROJECT` | Strict rejection: `STANDARD_MISMATCH` | ✅ PASSED |
| #246 | P0 Regression 06: Misleading authority name (`USDA Quality Certification` vs `USDA NOP`) | Strict rejection: `ISSUING_AUTHORITY_MISMATCH` | ✅ PASSED |
| #247 | P0 Regression 07: Authoritative record with empty string standard | Strict fail closed: `STANDARD_MISMATCH` | ✅ PASSED |
| #248 | P0 Regression 08: Authoritative record with empty string `issuingAuthority` | Strict fail closed: `ISSUING_AUTHORITY_MISMATCH` | ✅ PASSED |
| #249 | P0 Regression 09: Authoritative record with empty string brand | Strict fail closed: `MANUFACTURER_MISMATCH` | ✅ PASSED |
| #250 | P0 Regression 10: Authoritative record with empty string `evidenceUrl` | Strict fail closed: `EVIDENCE_URL_MISMATCH` | ✅ PASSED |
| #251 | P0 Regression 11: Forged claim with spoof registry domain (`ams.usda.gov.attacker.com`) | Strict fail closed: `UNAPPROVED_EVIDENCE_URL` | ✅ PASSED |
| #252 | P0 Regression 12: Forged claim with tampered attestation signature | Timing-safe check fails closed | ✅ PASSED |
| #253 | P0 Regression 13: Forged claim with stolen attestation token on wrong product ID | Binding check fails closed | ✅ PASSED |
| #254 | P0 Regression 14: Forged claim with expired attestation token | Expired token fails closed | ✅ PASSED |
| #255 | P0 Regression 15: Recommendation engine rejects forged claim without completed verif op | Zero bonus; attribute set to `NEEDS_REVIEW` | ✅ PASSED |



---

## 5. Live Autonomous Demonstrations (Including Dubai Championship Task)

1. **CHAMP-1 (Dubai Championship Benchmark):**
   - **Goal:** *"Find 5 vegetarian, peanut-free breakfast products available in India under ₹500"*
   - **Constraints Enforced:** `category: breakfast`, `diet: vegetarian`, `allergen: peanut-free`, `market: India (INR)`, `price <= ₹500`.
   - **Autonomous Outcome:** 5 candidates discovered, strictly screened through deterministic dietary engine, sorted by evidence quality. 0 false positives, 0 hallucinated ingredients.

2. **DEMO-1 (Severe Celiac Disease Safety):**
   - **Goal:** *"Find strictly gluten-free oat porridge suitable for celiac disease with verified oat purity"*
   - **Autonomous Outcome:** Validated against cross-contact risk and certified gluten-free registry.

3. **DEMO-2 (Pediatric Multi-Allergen Exclusion):**
   - **Goal:** *"Find certified vegan fruit snacks free of dairy, eggs, soy, and tree nuts for a toddler"*
   - **Autonomous Outcome:** Multi-allergen cross-contact elimination with zero trace risk.

4. **DEMO-3 (Low-Sugar Diabetic Breakfast):**
   - **Goal:** *"Find whole grain diabetic-safe cereal with under 5g sugar per 100g and no artificial sweeteners"*
   - **Autonomous Outcome:** Strict nutritional boundary verification (sugar <= 5g/100g).

---

## 6. Honest Remaining Limitations

1. **Live Supabase Staging Isolation:**
   - Automated test suites ran against the behavioral PostgreSQL emulator and schema audit. Destructive multi-user live queries were intentionally blocked from running against the live production database (`gpfiudwvlxotysmlzaew.supabase.co`) to preserve production user data.
2. **Crowdsourced Data Freshness:**
   - Open Food Facts data is public volunteer crowdsourced data. While Guardian records provenance and caveats, product formulations can change without notice. Physical packaging must always be verified by consumers before ingestion.
3. **Partner Catalog API:**
   - The partner connector requires `GUARDIAN_CATALOG_API_URL` and `GUARDIAN_CATALOG_API_KEY`. When unconfigured, Guardian cleanly falls back to internal and open public sources.

---

## 7. Rollback Procedures

- **Database:** Apply `schema_guardian_evidence_rollback.sql` and `schema_guardian_rollback.sql` in the Supabase SQL editor.
- **Git:** `git checkout main` or `git reset --hard 464749a`.
- **Vercel:** `npx vercel rollback`.
