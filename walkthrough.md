# Walkthrough: Dynamic Language Selection, Browser Language Auto-Detection, and Google Translate Syncing

We have implemented automatic browser language auto-detection, a clean custom LanguageSwitcher dropdown selector in the navigation header, database persistence with a JSONB fallback, and integrated language prompt modifiers. In addition, we bridged our custom dropdown with Google Translate to translate the entire webpage chrome UI instantly! We have also completed the integration of clean admin customer metrics filtering.

## Changes Made

### 1. Database Schema
* **`schema_language.sql` [NEW]**:
  * Created a copy-pasteable SQL migration script to add the `preferred_language` text column to the `public.profiles` database table.

### 2. Database Sync Helpers
* **`lib/language.ts` [NEW]**:
  * Added `saveUserLanguage(userId, lang)` and `getUserLanguage(userId)`. 
  * Features a double-fallback system: if the user hasn't executed the database migration yet, it dynamically reads/writes language preferences from/to the `dietary_profile` JSONB column instead of throwing errors.

### 3. Browser Language Detection
* **`proxy.ts` (Next.js Middleware)**:
  * Intercepts incoming page requests to check for the `preferred_lang` cookie.
  * If absent, parses `Accept-Language` headers, matches the primary code against supported options (`['en', 'hi', 'gu', 'te', 'ta', 'kn', 'mr', 'bn']`), and writes it to a long-lived cookie.

### 4. Language Selector Dropdown & Google Translate Sync
* **`components/LanguageSwitcher.tsx`**:
  * Expanded the language list to include major world languages (English, Hindi, Gujarati, Tamil, Telugu, Kannada, Marathi, Bengali, Spanish, French, German, Italian, Portuguese, Russian, Chinese, Japanese, Korean, and Arabic).
  * Added an auto-sync check: it automatically finds the hidden Google Translate select combo box (`.goog-te-combo`) and dispatches a change event so that selecting a language in our custom selector instantly translates the entire website's UI chrome as well!
* **`components/Header.tsx`**:
  * Rendered the `<LanguageSwitcher />` component adjacent to a hidden `<div id="google_translate_element" style={{ display: 'none' }}></div>` container.

### 5. AI Prompt Injection & Content Translation
* **`lib/claude.ts`**:
  * Updated `analyzeLabelWithGemini`, `enrichIngredientsText`, and `analyzeLabel` signature to take the `preferredLanguage` parameter.
  * Injects `CRITICAL LANGUAGE REQUIREMENT` directives instructing the AI models to write all descriptive/evaluative properties (such as health reasons, microplastics assessments, glycemic ratings, and alternative product recommendations) in the selected language.
* **`app/api/analyze/route.ts`**, **`app/api/compare/route.ts`**, and **`app/api/meal-composer/route.ts`**:
  * Reads the `preferred_lang` cookie on each request and forwards it to the prompt parameters to generate fully localized analysis results.

### 6. Clean Admin Metrics Filtering
* **`components/AdminDashboardClient.tsx`**:
  * Filtered out admin test user profiles (`kirtanpatel2326@gmail.com` and `kirtanpatel2305@gmail.com`) from organic stats: user lists, scans charts, active users count, safety ratings distributions, top products, and common allergen tables.
  * Ensures that stats represent strictly real customers and dynamic traffic.

## Verification & Testing

### Automated Checks
* Verified compiler type checker is 100% clean (`npx tsc --noEmit`).
* Successfully generated Next.js production builds locally (`npx next build --webpack`).

### Manual Validation
* Deployed live to production using Vercel.
