# ScanSafe Guardian — Implemented scope and limitations (2026-10-10)

## Implemented in this source package
- Existing user-provided ScanSafe source retained; previous deterministic Guardian engine retained.
- New `/guardian/agent` dedicated agent workspace, linked from `/guardian`.
- `POST /api/guardian/agent`: validated request, bounded server-side body, workflow stages and trace.
- Multi-stage deterministic orchestration, an optional approved external catalogue tool, up to one retry on catalogue failure, no fabricated fallback results, deterministic allergen/budget evaluation, shortlist ranking and explicit opt-in save.
- Optional manufacturer/partner catalogue adapter using fixed server-side HTTPS URL and API key; strict schema and response-size checks. Not connected to a real provider in this distribution.
- Supabase RLS migration and user-scoped saved shortlist API. **Schema has not been applied or verified against live DB**.
- `GET /api/guardian/history` for signed-in users once schema exists.
- Offline tests for agent behavior and earlier comparator. Synthetic test data only.

## Honest limitations
- This is a **bounded agentic workflow, not free-form LLM planning or a fully connected commercial food-shopping agent**.
- No valid catalog provider, model keys, manufacturer permission, real user study, live Supabase migration or external integrations were supplied or verified.
- Existing ScanSafe core features are retained in files, but end-to-end regression and Next.js production build are **not verified** because complete node dependencies are absent in this environment.
- Agent run history currently persists **only if the user opts into saving a shortlist**, not every step. Complete task state/immutable audit persistence remains for Antigravity.
- Security audit script is pattern-based; it is not a penetration test. No live site was deployed or changed.
- There are **no safety guarantees**. A `candidate` means an unverified comparison candidate, not a safe product. Always check package and manufacturer before eating, especially for allergies.

## Local commands
1. `npm ci` (network required); do not copy existing local node_modules.
2. Supply `.env.local` from `env` configuration privately; never commit secrets.
3. Apply `schema_guardian.sql` after careful staging review if task saving is desired.
4. Optional: `GUARDIAN_CATALOG_API_URL` (approved HTTPS provider endpoint) and `GUARDIAN_CATALOG_API_KEY`. Endpoint contract: `GET <configured-url>?q=<goal>&currency=INR` returns `{"products":[{"id":"...","name":"...","ingredients":"...","allergenStatement":"...","labelComplete":true,"evidenceSource":"...","price":99}]}`. All values require provider provenance and validation.
5. `node scripts/test-guardian-agent.cjs`; `node scripts/test-guardian-prototype.cjs`; `npm run lint`; `npm test`; `npm run build`.
6. Open `/guardian/agent` in staging and test with real labeled source evidence.

See `ANTIGRAVITY_MASTER_PROMPT.md` for complete remaining engineering plan and acceptance gates.
