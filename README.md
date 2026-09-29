# ScanSafe: AI Food Label & Ingredient Intelligence

ScanSafe empowers consumers to photograph packaged-food labels to extract listed ingredients, nutrition facts, and potential allergens, providing evidence-based nutritional estimates according to published dietary guidelines.

---

## 1. Supported Runtime & Prerequisites

- **Node.js**: `v18.17.0+` (LTS recommended)
- **Package Manager**: `npm` (v9+)
- **Framework**: `Next.js 15+` (App Router)
- **Database**: PostgreSQL (via Supabase)

---

## 2. Local Setup & Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Kirtanpatel2326/Scansafe.git
cd scansafe
npm install
```

Start the local development server:

```bash
npm run dev
```

The application will be accessible at [http://localhost:3000](http://localhost:3000).

---

## 3. Environment Variables

Create a local `.env.local` file containing the following variable definitions (do **not** commit secret values):

```ini
# Supabase Public & Service Keys
NEXT_PUBLIC_SUPABASE_URL="https://<project-id>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<public-anon-key>"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key-for-server-routes>"

# Vision & OCR AI Providers (Optional for local testing; demo mode runs locally)
ANTHROPIC_API_KEY="<anthropic-claude-api-key>"
GEMINI_API_KEY="<google-gemini-api-key>"

# Payment Gateways (Default: Disabled for safety)
ENABLE_LIVE_PAYMENTS="false"
NEXT_PUBLIC_ENABLE_LIVE_PAYMENTS="false"
RAZORPAY_KEY_ID="<razorpay-key-id>"
RAZORPAY_KEY_SECRET="<razorpay-secret>"

# Disposable Database for Integration Tests (Optional)
TEST_SUPABASE_URL="https://<test-project-id>.supabase.co"
TEST_SUPABASE_SERVICE_KEY="<test-service-role-key>"
# OR
TEST_DATABASE_URL="postgres://postgres:<password>@localhost:5432/testdb"
```

---

## 4. Database Migrations & Rollback Limitations

### Migration Order
1. `schema_v2.sql`: Authoritative schema establishing row-level security (RLS), atomic operation claiming (`claim_operation`), stale worker fencing tokens (`claim_seq`), idempotent refund ceilings (`refund_credits`), and accounting recovery (`recover_operation_accounting`).

### Applying Migrations
Apply `schema_v2.sql` directly within your Supabase SQL Editor or via PostgreSQL CLI:

```bash
psql "$TEST_DATABASE_URL" -f schema_v2.sql
```

### Rollback Limitations
- Rollbacks of table schemas with live data must be handled cautiously. `operations` and `payment_logs` enforce unique order and idempotency constraints; dropping columns without backup can result in unrecoverable transactional audit loss. Always run migrations on a disposable staging instance first.

---

## 5. Guest Demo Access (Zero Credits, No Sign-In)

ScanSafe includes a dedicated public guest demo at `/demo`:
- **Route**: [http://localhost:3000/demo](http://localhost:3000/demo) (or [https://scansafe.co.in/demo](https://scansafe.co.in/demo))
- **Features**:
  - Deterministic sample fixtures (`sample_cookies`, `sample_oats`).
  - No authentication required.
  - Zero credits debited.
  - Does not call external vision APIs.
  - Does not write sample scans into user history.
  - Real-time client-side dietary preference simulation (e.g. Vegan, Gluten, Dairy).

---

## 6. Testing & Release Gate Verification

Execute test suites using the following commands:

```bash
# 1. Run Comprehensive In-Memory Verification Suite (32 Gates)
npm test

# 2. Run Submission User Journey Verification
npm run test:flows

# 3. Run Real PostgreSQL Integration Suite (Requires disposable DB)
npm run test:postgres

# 4. Type & Lint Integrity
npx tsc --noEmit
npm run lint
```

### Meaning of Status Codes
- **PASS**: Behavioral assertions executed and succeeded against actual logic.
- **BLOCKED**: Test was safely bypassed because required disposable test infrastructure or test credentials were not configured. Release gates halt rather than claiming false success.
- **FAIL**: Code logic or database assertion failed. Build will not proceed.

---

## 7. Payment Safeguards (Prototype Demonstration Mode)

- Live payment checkout is disabled by default (`ENABLE_LIVE_PAYMENTS=false` and `NEXT_PUBLIC_ENABLE_LIVE_PAYMENTS=false`).
- Checkout endpoints (`/api/checkout` and `/api/manual-checkout`) strictly return `HTTP 503 (PAYMENTS_AWAITING_VERIFICATION)`.
- Pricing pages pull prices and scan counts exclusively from the server-owned catalog (`lib/plans.ts`) in Indian Rupees (INR).
- No timezone-based currency switching or international dollar conversion is performed.

---

## 8. Deployment & Known Limitations

### Deployment Steps
Deployments are continuously deployed via Vercel when changes are merged to the `main` branch on GitHub (`Kirtanpatel2326/Scansafe`).

To build locally:
```bash
npm run build
```

### Known Limitations & Methodological Disclaimers
1. **Label Extraction Quality**: Optical character recognition depends on label print clarity. Blurry, folded, or poorly lit packaging photos may yield unreadable text; missing fields are strictly reported as unknown.
2. **Nutritional Estimates**: Health scores are nutritional estimates based on declared nutrition tables and ingredient lists. ScanSafe does **not** certify food purity, chemical contamination, laboratory safety, or statutory regulatory compliance.
3. **Medical Advice**: ScanSafe does not offer clinical diagnosis or medical treatment guidance. Always consult licensed medical professionals for allergy and dietary health management.
