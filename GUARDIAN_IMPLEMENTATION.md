# ScanSafe + Guardian | Updated integration (October 10, 2026)

## Source and status
Based on user-provided `scansafe(9).zip`; builds on the prior Guardian integration. Existing scanner, account, billing, and other functionality were retained in the source tree. **No deployment or full application build was completed in this environment.**

## Verified changes
- Guardian workspace at `/guardian` and POST `/api/guardian` with bounded JSON input, Zod request validation, duplicate-ID rejection and no-store responses.
- A deterministic, source-transparent product-comparison engine (not an autonomous LLM agent).
- Updated precautionary allergen evaluation: relevant allergy mentions and ambiguous cross-contact statements require caution, while a clearly unrelated precautionary allergen alone does not block a comparison candidate.
- Negative / free-from claims for the selected restrictions are *never* interpreted as proof of safety.
- More regression cases: **18 Guardian assertions pass** (`node scripts/test-guardian-prototype.cjs`).
- Repository's pattern-based security audit ran with zero findings (`node scripts/security-audit.js`). This audit does not prove security or validate external infrastructure.
- Potentially sensitive environment and platform configuration files intentionally omitted from package.

## Required before production use
1. Install dependencies with network access: `npm ci`.
2. Populate fresh, authorized values in `.env.local` from `.env.example`. Rotate any secrets previously shared in uploaded source archives.
3. Run `npm run test:guardian`, `npm run lint`, `npm test`, `npm run build`.
4. Test camera upload, scanning, account, payments, credits, data persistence, mobile navigation and Guardian in staging.
5. Secure Guardian against abuse with account-aware rate limits and authenticated access if enabling persistent user tasks.
6. Add permitted product APIs and manufacturer-supported evidence, real agent orchestration with bounded tools, task state, approvals, evidence freshness and privacy handling.
7. Perform allergen domain-expert review, adversarial evaluation and independent end-to-end testing.

## Honest limitations
Guardian currently accepts **user-entered** product information. It does not independently verify manufacturer sources, retrieve catalogues, purchase products, persist agent plans or perform autonomous external actions. It cannot certify allergen safety. A `candidate` is an *unverified comparison candidate*, not an endorsement to consume.

The project has **not** been declared defect-free, security-certified or competition-ready. The full Next.js build and full regression suite could not be completed in this environment due to missing installed dependencies.
